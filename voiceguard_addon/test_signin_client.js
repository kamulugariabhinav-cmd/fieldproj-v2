const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const nodes=new Map(),calls=[],redirects=[];
function node(id){if(!nodes.has(id))nodes.set(id,{id,events:{},value:'',type:'password',textContent:'',disabled:false,
setAttribute(){},querySelector:()=>null,before(){},addEventListener(name,fn){this.events[name]=fn;},
reportValidity:()=>true,checkValidity:()=>true,focus(){}});return nodes.get(id);}
const user={email:'sample@example.test',getIdToken:async()=> 'token',updateProfile:async()=>{},sendEmailVerification:async()=>calls.push('verify-email')};
const auth={signInWithPopup:async provider=>calls.push(['github',provider.type]),
signInWithEmailAndPassword:async(email,password)=>(calls.push(['email',email,password]),{user}),
createUserWithEmailAndPassword:async(email,password)=>(calls.push(['create',email,password]),{user}),
sendPasswordResetEmail:async email=>calls.push(['reset',email])};
function firebaseAuth(){return auth;}firebaseAuth.GithubAuthProvider=class{type='github';};
const firebase={apps:[{}],auth:firebaseAuth};
const context=vm.createContext({window:{firebase},firebase,document:{getElementById:node,createElement:()=>node('section')},
  fetch:async()=>({ok:true,json:async()=>({saved:true,email:'sample@example.test'})}),location:{assign:href=>redirects.push(href)}});
(async()=>{
vm.runInContext(fs.readFileSync(__dirname+'/assets/signin-options.js','utf8'),context);
await node('homepageGithub').events.click();assert.deepEqual(calls[0],['github','github']);
node('homepageEmail').value=' sample@example.test ';node('homepagePassword').value='example-password';
await node('homepageEmailForm').events.submit({preventDefault(){}});assert.deepEqual(calls[1],['email','sample@example.test','example-password']);assert.equal(node('homepagePassword').value,'');
node('homepageCreateAccount').events.click();node('homepagePassword').value='new-example-password';
node('homepageConfirmPassword').value='new-example-password';node('signupName').value='Example';node('signupMobile').value='+919876543210';node('signupUsername').value='example_user';
node('homepageConfirmPassword').value='different';await node('homepageEmailForm').events.submit({preventDefault(){}});assert.match(node('signinStatus').textContent,/do not match/);assert.equal(calls.length,2);node('homepageConfirmPassword').value='new-example-password';
await node('homepageEmailForm').events.submit({preventDefault(){}});assert.equal(calls[2][0],'create');assert.equal(calls[3],'verify-email');
await node('homepageResetPassword').events.click();assert.deepEqual(calls[4],['reset','sample@example.test']);
assert(redirects.every(path=>path==='/dashboard'));
node('homepageCreateAccount').events.click();node('homepageEmail').value='example_user';node('homepagePassword').value='valid-password';await node('homepageEmailForm').events.submit({preventDefault(){}});assert.deepEqual(calls.at(-1),['email','sample@example.test','valid-password']);
auth.signInWithPopup=async()=>{throw {code:'auth/operation-not-allowed'};};
await node('homepageGithub').events.click();assert.match(node('signinStatus').textContent,/not enabled/);
assert.equal(node('homepageGithub').disabled,false);
console.log('Email, GitHub, account creation, reset, redirection, and provider-error checks passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
