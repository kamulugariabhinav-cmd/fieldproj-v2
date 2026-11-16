// Progressive enhancement: inference continues to read the original select.
(() => {
  document.querySelectorAll('select').forEach(enhanceSelect);
  function enhanceSelect(select){
  const key=select.id==='modelSelect'?'modelPicker':select.id+'Picker';
  const wrapper=document.createElement('div');wrapper.className='model-picker';
  const label=document.querySelector('label[for="'+select.id+'"]');
  const accessibleName=select.getAttribute('aria-label')||label?.textContent.trim()||'Choose an option';
  const trigger=document.createElement('button');trigger.type='button';trigger.id=key+'Trigger';trigger.className='model-picker-trigger';
  trigger.setAttribute('role','combobox');trigger.setAttribute('aria-haspopup','listbox');trigger.setAttribute('aria-expanded','false');trigger.setAttribute('aria-controls',key+'List');trigger.setAttribute('aria-label',accessibleName);
  const list=document.createElement('div');list.id=key+'List';list.className='model-picker-list';list.hidden=true;list.setAttribute('role','listbox');list.setAttribute('aria-label',accessibleName);
  select.before(wrapper);wrapper.append(trigger,list);const panel=select.closest('.panel');panel?.classList.add('model-picker-panel');
  let open=false,active=0,rows=[];
  const enabled=()=>[...select.options].map((option,index)=>option.disabled?-1:index).filter(index=>index>=0);
  function highlight(index){active=index;rows.forEach((row,i)=>row.classList.toggle('is-highlighted',i===index));trigger.setAttribute('aria-activedescendant',rows[index]?.id||'');if(open)rows[index]?.scrollIntoView({block:'nearest'});}
  function close(){open=false;list.hidden=true;trigger.setAttribute('aria-expanded','false');trigger.removeAttribute('aria-activedescendant');wrapper.classList.remove('is-open');panel?.classList.remove('model-picker-open');}
  function show(){if(select.disabled)return;open=true;list.hidden=false;wrapper.classList.add('is-open');panel?.classList.add('model-picker-open');trigger.setAttribute('aria-expanded','true');highlight(select.options[select.selectedIndex]?.disabled?enabled()[0]:select.selectedIndex);}
  function choose(index){if(select.disabled||select.options[index]?.disabled)return;select.selectedIndex=index;select.dispatchEvent(new Event('change',{bubbles:true}));sync();close();trigger.focus();}
  function sync(){trigger.disabled=select.disabled;trigger.textContent=select.options[select.selectedIndex]?.textContent.trim()||'Choose a detector';rows.forEach((row,index)=>row.setAttribute('aria-selected',String(index===select.selectedIndex)));if(select.disabled)close();}
  function build(){
    list.replaceChildren();rows=[...select.options].map((option,index)=>{
      const row=document.createElement('div');row.id=key+'Option'+index;row.className='model-picker-option';row.setAttribute('role','option');row.setAttribute('aria-disabled',String(option.disabled));
      const parts=option.textContent.trim().split('//'),name=document.createElement('strong'),detail=document.createElement('span');name.textContent=parts.shift().trim();detail.textContent=parts.join('//').trim();row.append(name,detail);
      // Keep focus on the combobox so focusout cannot hide the option before click.
      row.addEventListener('mousedown',event=>event.preventDefault());
      row.addEventListener('click',()=>choose(index));row.addEventListener('pointermove',()=>{if(!option.disabled)highlight(index);});list.append(row);return row;
    });sync();if(open)highlight(select.selectedIndex);
  }
  trigger.addEventListener('click',()=>open?close():show());
  trigger.addEventListener('keydown',event=>{
    if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){
      event.preventDefault();const choices=enabled();if(!choices.length)return;
      if(!open){show();return;}
      const position=choices.indexOf(active),next=event.key==='Home'?0:event.key==='End'?choices.length-1:(position+(event.key==='ArrowDown'?1:-1)+choices.length)%choices.length;highlight(choices[next]);
    }else if(event.key==='Enter'||event.key===' '){event.preventDefault();if(open)choose(active);else show();}
    else if(event.key==='Escape'){event.preventDefault();close();}
    else if(event.key==='Tab')close();
    else if(event.key.length===1&&!event.ctrlKey&&!event.metaKey){const match=enabled().find(index=>select.options[index].textContent.trim().toLowerCase().startsWith(event.key.toLowerCase()));if(match!==undefined){event.preventDefault();if(!open)show();highlight(match);}}
  });
  document.addEventListener('click',event=>{if(!wrapper.contains(event.target))close();});
  wrapper.addEventListener('focusout',event=>{if(!wrapper.contains(event.relatedTarget))close();});
  select.addEventListener('change',sync);
  new MutationObserver(build).observe(select,{attributes:true,childList:true,subtree:true,characterData:true});
  build();select.hidden=true;
  label?.setAttribute('for',trigger.id);
  }
})();
