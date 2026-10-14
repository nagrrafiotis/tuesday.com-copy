// Builds a standalone, interactive HTML report (single file, no external deps).
const categoryLabels = {
  labor: "Εργατικά",
  subcontractor: "Υπεργολάβοι",
  materials: "Υλικά",
  equipment: "Εξοπλισμός",
  general_expenses: "Γενικά Έξοδα",
};

const PAGE_CSS = `
*{box-sizing:border-box}
body{margin:0;font-family:Segoe UI,Arial,sans-serif;background:#f4f6f9;color:#1f2937}
header{background:#1e3a5f;color:#fff;padding:22px 32px}
header h1{margin:0;font-size:24px}
header div{font-size:13px;opacity:.85;margin-top:4px}
.wrap{max-width:1400px;margin:0 auto;padding:20px 32px 60px}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-bottom:20px}
.card{background:#fff;border-radius:10px;padding:14px 16px;box-shadow:0 1px 3px rgba(0,0,0,.08)}
.card .l{font-size:12px;color:#6b7280}
.card .v{font-size:20px;font-weight:700;margin-top:4px}
.pos{color:#057a55}.neg{color:#b43232}.navy{color:#1e3a5f}
.tabs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px}
.tab{border:1px solid #d1d5db;background:#fff;padding:8px 16px;border-radius:8px;cursor:pointer;font-size:14px;font-weight:600;color:#4b5563}
.tab.active{background:#1e3a5f;color:#fff;border-color:#1e3a5f}
.panel{display:none;background:#fff;border-radius:10px;box-shadow:0 1px 3px rgba(0,0,0,.08);padding:16px;overflow:auto}
.panel.active{display:block}
.tools{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px}
.tools input,.tools select{padding:7px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:14px}
.tools input{min-width:260px}
table{width:100%;border-collapse:collapse;font-size:13px}
th{background:#1e3a5f;color:#fff;text-align:left;padding:8px 10px;white-space:nowrap;position:sticky;top:0}
th.sortable{cursor:pointer;user-select:none}
th.sortable:hover{background:#2a4d7c}
th.r,td.r{text-align:right}
td{padding:7px 10px;border-bottom:1px solid #eef0f3}
tbody tr.data:hover{background:#f7f9fc}
tfoot td{background:#f0f2f5;font-weight:700;color:#1e3a5f}
tr.grp td{background:#1e3a5f;color:#fff;font-weight:700;cursor:pointer;padding:9px 10px}
tr.grp .note{display:block;font-size:12px;font-weight:400;opacity:.85}
tr.sub td{background:#f3f5f8;font-weight:600}
.count{font-size:12px;color:#6b7280;margin:0 0 8px}
.empty{padding:30px;text-align:center;color:#9ca3af}
@media print{.tools,.tabs{display:none}.panel{display:block!important;margin-bottom:20px;box-shadow:none}}
`;

const PAGE_JS = `
const fmt=v=>new Intl.NumberFormat('el-GR',{style:'currency',currency:'EUR'}).format(v||0);
const fdate=d=>{if(!d)return '—';const x=new Date(d);return isNaN(x)?d:x.toLocaleDateString('el-GR')};
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const D=window.REPORT_DATA;
const state={};

function show(id){
  document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active',t.dataset.id===id));
  document.querySelectorAll('.panel').forEach(p=>p.classList.toggle('active',p.id===id));
}
document.querySelectorAll('.tab').forEach(t=>t.onclick=()=>show(t.dataset.id));

function cmp(a,b,type){
  if(a==null||a==='')return 1; if(b==null||b==='')return -1;
  if(type==='num')return a-b;
  if(type==='date')return new Date(a)-new Date(b);
  return String(a).localeCompare(String(b),'el',{numeric:true});
}

// Generic sortable/searchable table
function setupTable(id,rows,cols,opts={}){
  const st=state[id]={sortKey:opts.sortKey||cols[0].key,dir:opts.dir||1,q:'',cat:''};
  const root=document.getElementById(id);
  const cats=opts.categoryKey?[...new Set(rows.map(r=>r[opts.categoryKey]).filter(Boolean))]:[];
  root.innerHTML=
    '<div class="tools"><input placeholder="Αναζήτηση..." data-q>'+
    (cats.length?'<select data-cat><option value="">Όλες οι κατηγορίες</option>'+cats.map(c=>'<option>'+esc(c)+'</option>').join('')+'</select>':'')+
    '</div><p class="count" data-count></p><table><thead><tr>'+
    cols.map(c=>'<th class="sortable'+(c.r?' r':'')+'" data-k="'+c.key+'">'+esc(c.label)+' <span data-arrow="'+c.key+'"></span></th>').join('')+
    '</tr></thead><tbody></tbody><tfoot></tfoot></table>';
  const body=root.querySelector('tbody'),foot=root.querySelector('tfoot'),count=root.querySelector('[data-count]');
  function draw(){
    const q=st.q.toLowerCase();
    let list=rows.filter(r=>(!st.cat||r[opts.categoryKey]===st.cat)&&(!q||cols.some(c=>String(r[c.key]??'').toLowerCase().includes(q))));
    const col=cols.find(c=>c.key===st.sortKey);
    list=[...list].sort((a,b)=>st.dir*cmp(a[st.sortKey],b[st.sortKey],col.type));
    body.innerHTML=list.length?list.map(r=>'<tr class="data">'+cols.map(c=>'<td'+(c.r?' class="r"':'')+'>'+(c.type==='num'&&c.money?fmt(r[c.key]):c.type==='date'?fdate(r[c.key]):esc(r[c.key]))+'</td>').join('')+'</tr>').join(''):'<tr><td colspan="'+cols.length+'" class="empty">Δεν βρέθηκαν εγγραφές</td></tr>';
    const sumCol=cols.find(c=>c.sum);
    foot.innerHTML=sumCol?'<tr><td colspan="'+(cols.length-1)+'">ΣΥΝΟΛΟ (εμφανιζόμενα)</td><td class="r">'+fmt(list.reduce((s,r)=>s+(r[sumCol.key]||0),0))+'</td></tr>':'';
    count.textContent=list.length+' εγγραφές';
    root.querySelectorAll('[data-arrow]').forEach(a=>a.textContent=a.dataset.arrow===st.sortKey?(st.dir>0?'▲':'▼'):'');
  }
  root.querySelector('[data-q]').oninput=e=>{st.q=e.target.value;draw()};
  const sel=root.querySelector('[data-cat]');if(sel)sel.onchange=e=>{st.cat=e.target.value;draw()};
  root.querySelectorAll('th.sortable').forEach(th=>th.onclick=()=>{const k=th.dataset.k;if(st.sortKey===k)st.dir*=-1;else{st.sortKey=k;st.dir=1}draw()});
  draw();
}

// Budget: grouped by subcategory, collapsible, searchable
function setupBudget(){
  const root=document.getElementById('budget');
  const items=D.budget;
  if(!items.length){root.innerHTML='<div class="empty">Δεν υπάρχουν budget items</div>';return}
  root.innerHTML='<div class="tools"><input placeholder="Αναζήτηση..." data-q><button class="tab" data-all>Ανοιγμα / Κλείσιμο όλων</button></div>'+
  '<table><thead><tr>'+['Κατηγορία','Περιγραφή','Ποσ.','Μον.','Τιμή/Μον.','Σύνολο','ΦΠΑ %','ΦΠΑ (€)','Τελικό'].map((h,i)=>'<th'+(i>=4?' class="r"':'')+'>'+h+'</th>').join('')+'</tr></thead><tbody></tbody><tfoot></tfoot></table>';
  const body=root.querySelector('tbody'),foot=root.querySelector('tfoot');
  const closed=new Set();let q='';
  const vat=b=>(b.total_cost||0)*((b.vat_percent||0)/100);
  function draw(){
    const list=items.filter(b=>!q||[b.category,b.subcategory,b.description].some(x=>String(x||'').toLowerCase().includes(q)));
    const groups={};
    list.forEach(b=>{const k=(b.subcategory||'').trim();(groups[k]=groups[k]||[]).push(b)});
    const names=Object.keys(groups).sort((a,b)=>!a?1:!b?-1:a.localeCompare(b,'el',{numeric:true}));
    let html='',gt=0,gv=0;
    names.forEach(n=>{
      const g=groups[n],sub=g.reduce((s,b)=>s+(b.total_cost||0),0),sv=g.reduce((s,b)=>s+vat(b),0);
      gt+=sub;gv+=sv;
      const note=D.notes[n]||'';
      html+='<tr class="grp" data-g="'+esc(n)+'"><td colspan="5">'+(closed.has(n)?'▶ ':'▼ ')+(note?'<span style="font-size:15px">'+esc(note)+'</span><span class="note">'+esc(n||'Χωρίς υποκατηγορία')+' ('+g.length+' items)</span>':esc(n||'Χωρίς υποκατηγορία')+' ('+g.length+' items)')+'</td><td class="r">'+fmt(sub)+'</td><td></td><td class="r">'+fmt(sv)+'</td><td class="r">'+fmt(sub+sv)+'</td></tr>';
      if(!closed.has(n)){
        g.forEach(b=>{html+='<tr class="data"><td>'+esc(D.labels[b.category]||b.category||'—')+'</td><td>'+esc(b.description)+'</td><td class="r">'+esc(b.quantity??'')+'</td><td>'+esc(b.unit)+'</td><td class="r">'+fmt(b.unit_cost)+'</td><td class="r">'+fmt(b.total_cost)+'</td><td class="r">'+(b.vat_percent??0)+'%</td><td class="r">'+fmt(vat(b))+'</td><td class="r"><b>'+fmt((b.total_cost||0)+vat(b))+'</b></td></tr>'});
        html+='<tr class="sub"><td colspan="5" class="r">Υποσύνολο '+esc(n||'Χωρίς υποκατηγορία')+'</td><td class="r">'+fmt(sub)+'</td><td></td><td class="r">'+fmt(sv)+'</td><td class="r">'+fmt(sub+sv)+'</td></tr>';
      }
    });
    body.innerHTML=html;
    foot.innerHTML='<tr><td colspan="5">ΣΥΝΟΛΟ ΠΡΟΫΠΟΛΟΓΙΣΜΟΥ</td><td class="r">'+fmt(gt)+'</td><td></td><td class="r">'+fmt(gv)+'</td><td class="r">'+fmt(gt+gv)+'</td></tr>';
    body.querySelectorAll('tr.grp').forEach(r=>r.onclick=()=>{const n=r.dataset.g;closed.has(n)?closed.delete(n):closed.add(n);draw()});
  }
  root.querySelector('[data-q]').oninput=e=>{q=e.target.value.toLowerCase();draw()};
  root.querySelector('[data-all]').onclick=()=>{const all=[...new Set(items.map(b=>(b.subcategory||'').trim()))];if(closed.size)closed.clear();else all.forEach(n=>closed.add(n));draw()};
  draw();
}

setupTable('expenses',D.expenses,[
  {key:'date',label:'Ημ/νία',type:'date'},{key:'category',label:'Κατηγορία'},{key:'payee',label:'Δικαιούχος'},
  {key:'description',label:'Περιγραφή'},{key:'amount',label:'Ποσό',type:'num',money:true,r:true,sum:true}],
  {sortKey:'date',categoryKey:'category'});
setupTable('incomes',D.incomes,[
  {key:'date',label:'Ημ/νία',type:'date'},{key:'source',label:'Πηγή / Πελάτης'},{key:'description',label:'Περιγραφή'},
  {key:'category',label:'Κατηγορία'},{key:'amount',label:'Ποσό',type:'num',money:true,r:true,sum:true}],
  {sortKey:'date',categoryKey:'category'});
setupTable('bycat',D.byCategory,[
  {key:'category',label:'Κατηγορία'},{key:'count',label:'Εγγραφές',type:'num',r:true},
  {key:'total',label:'Σύνολο',type:'num',money:true,r:true,sum:true}],{sortKey:'total',dir:-1});
setupBudget();
`;

const safeJson = (o) => JSON.stringify(o).replace(/</g, "\\u003c").replace(/\u2028|\u2029/g, "");
const escHtml = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

export function buildInteractiveReport({ project, expenses, invoices, incomes, budgetItems, notes = {} }) {
  const fmt = (v) => new Intl.NumberFormat("el-GR", { style: "currency", currency: "EUR" }).format(v || 0);
  const label = (c) => categoryLabels[c] || c || "—";

  const expInv = invoices.filter((i) => i.type === "expense");
  const incInv = invoices.filter((i) => i.type === "income");
  const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const totalInvExp = expInv.reduce((s, i) => s + (i.total_amount || 0), 0);
  const totalInvInc = incInv.reduce((s, i) => s + (i.total_amount || 0), 0);
  const totalIncome = incomes.reduce((s, i) => s + (i.amount || 0), 0) + totalInvInc;
  const totalCosts = totalExpenses + totalInvExp;
  const balance = totalIncome - totalCosts;
  const totalBudget = budgetItems.reduce((s, b) => s + (b.total_cost || 0), 0) || project.budget || 0;
  const remaining = totalBudget - totalCosts;

  const expRows = [
    ...expenses.map((e) => ({ date: e.date, category: label(e.category), payee: e.payee || "", description: e.description || "", amount: e.amount || 0 })),
    ...expInv.map((i) => ({ date: i.date, category: label(i.category), payee: i.vendor_client || "", description: i.description || i.invoice_number || "", amount: i.total_amount || 0 })),
  ];
  const incRows = [
    ...incomes.map((i) => ({ date: i.date, source: i.source || "", description: i.description || "", category: i.category || "", amount: i.amount || 0 })),
    ...incInv.map((i) => ({ date: i.date, source: i.vendor_client || "", description: i.invoice_number || i.description || "", category: "Τιμολόγιο", amount: i.total_amount || 0 })),
  ];
  const catMap = {};
  expRows.forEach((e) => {
    catMap[e.category] = catMap[e.category] || { category: e.category, count: 0, total: 0 };
    catMap[e.category].count += 1;
    catMap[e.category].total += e.amount;
  });

  const data = {
    expenses: expRows,
    incomes: incRows,
    byCategory: Object.values(catMap),
    budget: budgetItems.map((b) => ({
      category: b.category, subcategory: b.subcategory || "", description: b.description || "",
      quantity: b.quantity, unit: b.unit || "", unit_cost: b.unit_cost, total_cost: b.total_cost, vat_percent: b.vat_percent,
    })),
    labels: categoryLabels,
    notes,
  };

  const card = (l, v, cls) => `<div class="card"><div class="l">${escHtml(l)}</div><div class="v ${cls}">${escHtml(v)}</div></div>`;
  const now = new Date().toLocaleString("el-GR");

  return `<!DOCTYPE html>
<html lang="el"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escHtml(project.name || "Αναφορά Έργου")}</title><style>${PAGE_CSS}</style></head>
<body>
<header><h1>${escHtml(project.name || "Αναφορά Έργου")}</h1>
<div>Δημιουργία: ${escHtml(now)}${project.address ? " · " + escHtml(project.address) : ""}</div></header>
<div class="wrap">
  <div class="cards">
    ${card("Σύνολο Εσόδων", fmt(totalIncome), "pos")}
    ${card("Σύνολο Εξόδων", fmt(totalCosts), "neg")}
    ${card("Καθαρό Αποτέλεσμα", fmt(balance), balance >= 0 ? "pos" : "neg")}
    ${card("Προϋπολογισμός", fmt(totalBudget), "navy")}
    ${card("Υπόλοιπο Προϋπολογισμού", fmt(remaining), remaining >= 0 ? "pos" : "neg")}
    ${card("Πρόοδος", (project.progress || 0) + "%", "navy")}
  </div>
  <div class="tabs">
    <button class="tab active" data-id="budget">Προϋπολογισμός</button>
    <button class="tab" data-id="expenses">Αναλυτικά Έξοδα</button>
    <button class="tab" data-id="incomes">Αναλυτικά Έσοδα</button>
    <button class="tab" data-id="bycat">Έξοδα ανά Κατηγορία</button>
  </div>
  <div class="panel active" id="budget"></div>
  <div class="panel" id="expenses"></div>
  <div class="panel" id="incomes"></div>
  <div class="panel" id="bycat"></div>
</div>
<script>window.REPORT_DATA=${safeJson(data)};</script>
<script>${PAGE_JS}</script>
</body></html>`;
}

export function downloadHtml(html, filename) {
  const blob = new Blob([html], { type: "text/html;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}