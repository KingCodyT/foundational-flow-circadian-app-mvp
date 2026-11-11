const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript'),React=require('react');
const {create,act}=require('react-test-renderer'),load=require('./load-typescript.cjs');
test('assessment restores saved position, URL history and answers without changing the 16 questions',()=>{
 const {questionnaire,categoryDefinitions}=load('lib/questionnaire.ts');assert.equal(questionnaire.length,16);
 const saved=new Map([['ff-assessment-position:test','4']]);let shown,tree;
 const provider={clientId:'test',isHydrated:true,answers:Object.fromEntries(questionnaire.map(q=>[q.id,q.options[0].value])),setAnswer(){}};
 const router={isReady:true,pathname:'/audit',query:{},push(value){if(typeof value==='object')this.query=value.query;},replace(value){this.query=value.query;}};
 const shell=({children})=>React.createElement('main',null,children);
 const req=id=>id==='next/router'?{useRouter:()=>router}:id==='@/components/circadian-provider'?{useCircadian:()=>provider}:id==='@/lib/questionnaire'?{questionnaire,categoryDefinitions}:id==='@/components/flow-shell'?{FlowShell:shell}:id==='@/components/progress-bar'?{ProgressBar:()=>null}:id==='@/components/section-heading'?{SectionHeading:()=>null}:id==='@/components/question-card'?{QuestionCard:p=>{shown=p;return null}}:require(id);
 const mod={exports:{}};const code=ts.transpileModule(fs.readFileSync('views/audit-page.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 new Function('require','module','exports','window','localStorage',code)(req,mod,mod.exports,{scrollTo(){}},{getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v)});
 const render=()=>React.createElement(mod.exports.default);
 act(()=>{tree=create(render())});assert.equal(shown.question.id,questionnaire[4].id);assert.equal(router.query.question,5);
 router.query={question:2};act(()=>tree.update(render()));assert.equal(shown.question.id,questionnaire[1].id);assert.equal(shown.selectedValue,questionnaire[1].options[0].value);
 act(()=>tree.unmount());router.query={};act(()=>{tree=create(render())});assert.equal(shown.question.id,questionnaire[1].id);act(()=>tree.unmount());
});

test('assessment puts Next above Previous on phones and retains desktop row order',()=>{
 const source=fs.readFileSync('views/audit-page.tsx','utf8');
 assert.match(source,/flex flex-col-reverse gap-3 sm:flex-row sm:justify-between/);
 assert.ok(source.indexOf('Previous question')<source.indexOf('Next question'));
});
