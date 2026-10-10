"""
RawNet2 Architecture for Audio Deepfake / Anti-Spoofing Detection
================================================================
Adapted from Clova AI / ASVspoof 2021 RawNet2 baseline (Tak et al.).
Pure PyTorch implementation:
- SincConv filterbank (sinc-based bandpass front-end)
- Residual blocks with Feature Map Scaling (FMS) attention
- GRU temporal aggregation
- FC classification head (outputs spoof vs bonafide logits)
"""

import copy
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch import Tensor


class SincConv(nn.Module):
    @staticmethod
    def to_mel(hz):
        return 2595 * np.log10(1 + hz / 700)

    @staticmethod
    def to_hz(mel):
        return 700 * (10 ** (mel / 2595) - 1)

    def __init__(
        self,
        out_channels: int,
        kernel_size: int,
        in_channels: int = 1,
        sample_rate: int = 16000,
        stride: int = 1,
        padding: int = 0,
        dilation: int = 1,
        bias: bool = False,
        groups: int = 1,
    ):
        super().__init__()
        if in_channels != 1:
            raise ValueError(f"SincConv only supports 1 input channel (received: {in_channels})")
        if bias:
            raise ValueError("SincConv does not support bias.")
        if groups > 1:
            raise ValueError("SincConv does not support groups > 1.")

        self.out_channels = out_channels
        self.kernel_size = kernel_size if kernel_size % 2 != 0 else kernel_size + 1
        self.sample_rate = sample_rate
        self.stride = stride
        self.padding = padding
        self.dilation = dilation

        # Initialize filterbanks using Mel scale
        NFFT = 512
        f = int(self.sample_rate / 2) * np.linspace(0, 1, int(NFFT / 2) + 1)
        fmel = self.to_mel(f)
        fmelmax = np.max(fmel)
        fmelmin = np.min(fmel)
        filbandwidthsmel = np.linspace(fmelmin, fmelmax, self.out_channels + 1)
        filbandwidthsf = self.to_hz(filbandwidthsmel)
        self.mel = filbandwidthsf
        self.hsupp = torch.arange(-(self.kernel_size - 1) / 2, (self.kernel_size - 1) / 2 + 1)
        self.band_pass = torch.zeros(self.out_channels, self.kernel_size)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        for i in range(len(self.mel) - 1):
            fmin = self.mel[i]
            fmax = self.mel[i + 1]
            hHigh = (2 * fmax / self.sample_rate) * np.sinc(
                2 * fmax * self.hsupp.numpy() / self.sample_rate
            )
            hLow = (2 * fmin / self.sample_rate) * np.sinc(
                2 * fmin * self.hsupp.numpy() / self.sample_rate
            )
            hideal = hHigh - hLow
            self.band_pass[i, :] = Tensor(np.hamming(self.kernel_size)) * Tensor(hideal)

        band_pass_filter = self.band_pass.to(x.device)
        filters = band_pass_filter.view(self.out_channels, 1, self.kernel_size)

        return F.conv1d(
            x,
            filters,
            stride=self.stride,
            padding=self.padding,
            dilation=self.dilation,
            bias=None,
            groups=1,
        )


class ResidualBlock(nn.Module):
    def __init__(self, nb_filts, first: bool = False):
        super().__init__()
        self.first = first
        if not self.first:
            self.bn1 = nn.BatchNorm1d(num_features=nb_filts[0])
        self.lrelu = nn.LeakyReLU(negative_slope=0.3)
        self.conv1 = nn.Conv1d(
            in_channels=nb_filts[0],
            out_channels=nb_filts[1],
            kernel_size=3,
            padding=1,
            stride=1,
        )
        self.bn2 = nn.BatchNorm1d(num_features=nb_filts[1])
        self.conv2 = nn.Conv1d(
            in_channels=nb_filts[1],
            out_channels=nb_filts[1],
            padding=1,
            kernel_size=3,
            stride=1,
        )

        if nb_filts[0] != nb_filts[1]:
            self.downsample = True
            self.conv_downsample = nn.Conv1d(
                in_channels=nb_filts[0],
                out_channels=nb_filts[1],
                padding=0,
                kernel_size=1,
                stride=1,
            )
        else:
            self.downsample = False
        self.mp = nn.MaxPool1d(3)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        identity = x
        if not self.first:
            out = self.bn1(x)
            out = self.lrelu(out)
        else:
            out = x

        out = self.conv1(out)
        out = self.bn2(out)
        out = self.lrelu(out)
        out = self.conv2(out)

        if self.downsample:
            identity = self.conv_downsample(identity)

        out += identity
        out = self.mp(out)
        return out


class RawNet2Model(nn.Module):
    """
    RawNet2 end-to-end anti-spoofing model.
    Matches ASVspoof 2021 pre_trained_DF_RawNet2 checkpoint exact parameter structure.
    """
    def __init__(self, d_args: dict):
        super().__init__()
        # Work on a deepcopy to avoid mutating input dictionary
        cfg = copy.deepcopy(d_args)

        self.Sinc_conv = SincConv(
            out_channels=cfg["filts"][0],
            kernel_size=cfg["first_conv"],
            in_channels=cfg["in_channels"],
        )

        self.first_bn = nn.BatchNorm1d(num_features=cfg["filts"][0])
        self.selu = nn.SELU(inplace=True)
        self.block0 = nn.Sequential(ResidualBlock(nb_filts=cfg["filts"][1], first=True))
        self.block1 = nn.Sequential(ResidualBlock(nb_filts=cfg["filts"][1]))
        self.block2 = nn.Sequential(ResidualBlock(nb_filts=cfg["filts"][2]))
        cfg["filts"][2][0] = cfg["filts"][2][1]
        self.block3 = nn.Sequential(ResidualBlock(nb_filts=cfg["filts"][2]))
        self.block4 = nn.Sequential(ResidualBlock(nb_filts=cfg["filts"][2]))
        self.block5 = nn.Sequential(ResidualBlock(nb_filts=cfg["filts"][2]))
        self.avgpool = nn.AdaptiveAvgPool1d(1)

        self.fc_attention0 = self._make_attention_fc(
            in_features=cfg["filts"][1][-1], l_out_features=cfg["filts"][1][-1]
        )
        self.fc_attention1 = self._make_attention_fc(
            in_features=cfg["filts"][1][-1], l_out_features=cfg["filts"][1][-1]
        )
        self.fc_attention2 = self._make_attention_fc(
            in_features=cfg["filts"][2][-1], l_out_features=cfg["filts"][2][-1]
        )
        self.fc_attention3 = self._make_attention_fc(
            in_features=cfg["filts"][2][-1], l_out_features=cfg["filts"][2][-1]
        )
        self.fc_attention4 = self._make_attention_fc(
            in_features=cfg["filts"][2][-1], l_out_features=cfg["filts"][2][-1]
        )
        self.fc_attention5 = self._make_attention_fc(
            in_features=cfg["filts"][2][-1], l_out_features=cfg["filts"][2][-1]
        )

        self.bn_before_gru = nn.BatchNorm1d(num_features=cfg["filts"][2][-1])
        self.gru = nn.GRU(
            input_size=cfg["filts"][2][-1],
            hidden_size=cfg["gru_node"],
            num_layers=cfg["nb_gru_layer"],
            batch_first=True,
        )

        self.fc1_gru = nn.Linear(in_features=cfg["gru_node"], out_features=cfg["nb_fc_node"])
        self.fc2_gru = nn.Linear(
            in_features=cfg["nb_fc_node"], out_features=cfg["nb_classes"], bias=True
        )

        self.sig = nn.Sigmoid()
        self.logsoftmax = nn.LogSoftmax(dim=1)

    def _make_attention_fc(self, in_features: int, l_out_features: int):
        return nn.Sequential(nn.Linear(in_features=in_features, out_features=l_out_features))

    def forward(self, x: torch.Tensor):
        # Expected input shape: [batch, samples]
        nb_samp = x.shape[0]
        len_seq = x.shape[1]
        x = x.view(nb_samp, 1, len_seq)

        x = self.Sinc_conv(x)
        x = F.max_pool1d(torch.abs(x), 3)
        x = self.first_bn(x)
        x = self.selu(x)

        x0 = self.block0(x)
        y0 = self.avgpool(x0).view(x0.size(0), -1)
        y0 = self.fc_attention0(y0)
        y0 = self.sig(y0).view(y0.size(0), y0.size(1), -1)
        x = x0 * y0 + y0

        x1 = self.block1(x)
        y1 = self.avgpool(x1).view(x1.size(0), -1)
        y1 = self.fc_attention1(y1)
        y1 = self.sig(y1).view(y1.size(0), y1.size(1), -1)
        x = x1 * y1 + y1

        x2 = self.block2(x)
        y2 = self.avgpool(x2).view(x2.size(0), -1)
        y2 = self.fc_attention2(y2)
        y2 = self.sig(y2).view(y2.size(0), y2.size(1), -1)
        x = x2 * y2 + y2

        x3 = self.block3(x)
        y3 = self.avgpool(x3).view(x3.size(0), -1)
        y3 = self.fc_attention3(y3)
        y3 = self.sig(y3).view(y3.size(0), y3.size(1), -1)
        x = x3 * y3 + y3

        x4 = self.block4(x)
        y4 = self.avgpool(x4).view(x4.size(0), -1)
        y4 = self.fc_attention4(y4)
        y4 = self.sig(y4).view(y4.size(0), y4.size(1), -1)
        x = x4 * y4 + y4

        x5 = self.block5(x)
        y5 = self.avgpool(x5).view(x5.size(0), -1)
        y5 = self.fc_attention5(y5)
        y5 = self.sig(y5).view(y5.size(0), y5.size(1), -1)
        x = x5 * y5 + y5

        x = self.bn_before_gru(x)
        x = self.selu(x)
        x = x.permute(0, 2, 1)  # (batch, time, filt)
        self.gru.flatten_parameters()
        x, _ = self.gru(x)
        x = x[:, -1, :]
        last_hidden = self.fc1_gru(x)
        x = self.fc2_gru(last_hidden)
        output = self.logsoftmax(x)

        return last_hidden, output