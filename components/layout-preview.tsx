"use client";
import {Dice5,Gauge,Users,FileText} from 'lucide-react';
import type {PosLayout,ColumnConfig} from '@/components/desktop-model-previews';
import {layoutColumns} from '@/components/desktop-model-previews';

const samplePlays=[
  {lottery:'GEORGIA EVENING',number:'12',amount:2,type:'DIRECTO'},
  {lottery:'GEORGIA EVENING',number:'34',amount:2,type:'PALÉ'},
  {lottery:'FL PICK 2',number:'56',amount:2,type:'CASH 3'},
  {lottery:'FL PICK 2',number:'7890',amount:2,type:'PLAY 4'},
  {lottery:'FL PICK 2',number:'12345',amount:2,type:'PICK 5'},
];

function playGroup(type:string){return type==='DIRECTO'||type==='REVÈ'||type==='BOUL PÈ'?'DIRECTO':type;}

function MiniColumn({col}:{col:ColumnConfig}){
  const colPlays=samplePlays.filter(p=>col.groups.includes(playGroup(p.type)));
  const colTotal=colPlays.reduce((s,p)=>s+p.amount,0);
  const Icon=col.icon==='dice'?Dice5:col.icon==='gauge'?Gauge:Users;
  return <article className="layout-preview-card" data-show-total={col.showTotal}>
    <header><span><Icon/></span><h2>{col.title}</h2><b>{colPlays.length}</b></header>
    <div className="layout-preview-table">
      <div className="layout-preview-head"><span>Lotri</span><span>Nimewo</span><span>$</span></div>
      {colPlays.length?colPlays.map((p,i)=><div className="layout-preview-row" key={i}><span>{p.lottery.slice(0,8)}</span><strong>{p.number}</strong><span>${p.amount.toFixed(2)}</span></div>):<div className="layout-preview-empty"><FileText/><span>Vide</span></div>}
    </div>
    {col.showTotal&&<footer><span>TOTAL</span><output>${colTotal.toFixed(2)}</output></footer>}
  </article>;
}

export function LayoutPreview({layout}:{layout:PosLayout}){
  return <div className="layout-preview-grid">{layoutColumns[layout].map(col=><MiniColumn key={col.title} col={col}/>)}</div>;
}
