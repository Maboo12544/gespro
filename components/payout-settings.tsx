"use client";
import {Localized} from "@/components/language-settings";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const payoutRows = [
  { label: "Tripleta — 3 boul", value: 0, group: "Tripleta" },
  { label: "1st — Premye lo", value: 65, group: "Bòlèt" },
  { label: "2nd — Dezyèm lo", value: 15, group: "Bòlèt" },
  { label: "3rd — Twazyèm lo", value: 10, group: "Bòlèt" },
  { label: "Doubles — Boul pè", value: 65, group: "Bòlèt" },
  ...["1-2", "1-3", "2-1", "2-3", "3-1", "3-2"].map(pair => ({ label: "Palé " + pair, value: 800, group: "Palé" })),
  { label: "Pick3 Straight", value: 700, group: "Pick3" },
  ...[3, 6].map(ways => ({ label: "Pick3 Box " + ways + "way", value: 100, group: "Pick3 Box" })),
  { label: "Pick3 Doubles", value: 500, group: "Pick3" },
  { label: "Pick4 Straight", value: 4000, group: "Pick4" },
  ...[4, 6, 12, 24].map(ways => ({ label: "Pick4 Box " + ways + "way", value: 200, group: "Pick4 Box" })),
  { label: "Pick5 Straight", value: 0, group: "Pick5" },
  ...[5, 10, 20, 30, 60, 120].map(ways => ({ label: "Pick5 Box " + ways + "way", value: 0, group: "Pick5 Box" })),
  { label: "Pick3 Back", value: 0, group: "Pick3 Back" },
];
export type PayoutRates = Record<string, string>;
export const defaultPayoutRates = (): PayoutRates => Object.fromEntries(payoutRows.map(row => [row.label, row.value.toFixed(2)]));

export function PayoutSettings({ bank, rates, onSave, dominican=false }: { bank: string; rates: PayoutRates; dominican?:boolean; onSave: (rates: PayoutRates) => void }) {
  const rows=dominican?payoutRows.filter(row=>["Bòlèt","Palé","Tripleta"].includes(row.group)):payoutRows;
  const [draft, setDraft] = useState(() => ({ ...defaultPayoutRates(), ...rates }));
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const dirty = rows.some(row => draft[row.label] !== rates[row.label]);
  const valid = (value: string) => /^\d+(\.\d{1,2})?$/.test(value) && Number.isFinite(Number(value));
  function change(label: string, value: string) { setDraft(items => ({ ...items, [label]: value })); setMessage(""); }
  function groupApply(group: string, value: string) {
    if (!valid(value)) { setMessage("Antre yon tarif pozitif oswa zewo, avèk jiska 2 chif apre pwen."); return; }
    setDraft(items => ({ ...items, ...Object.fromEntries(payoutRows.filter(row => row.group === group).map(row => [row.label, value])) }));
    setMessage("Valè a kopye sou tout liy gwoup " + group + " la. Valide pou kenbe li.");
  }
  function save() {
    if (rows.some(row => !valid(draft[row.label]))) { setMessage("Verifye tarif yo: pa kite chan vid, negatif oswa plis pase 2 desimal."); return; }
    const normalized = {...rates,...Object.fromEntries(rows.map(row => [row.label, Number(draft[row.label]).toFixed(2)]))};
    setDraft(normalized); onSave(normalized); setMessage("Tarif yo valide pou " + bank + ". Anrejistre konfigirasyon bank la pou sove sou sèvè a.");
  }
  return <section className="panel payout-panel">
    <div className="panel-title"><div><p className="eyebrow">KONFIGIRASYON BANK • {bank}</p><h2><Localized text={"Peman pa kalite jwèt"}/></h2></div><span className="status valide">Tarif bank la</span></div>
    <p className="payout-note">Valè depa dapre modèl ou a. Valide tarif yo isit la, epi anrejistre konfigirasyon bank la nan espas bank konekte a. Kalkil pri ak peman otomatik poko aktive.</p>
    <label className="payout-search">Chèche kalite jwèt<Input value={query} onChange={event => setQuery(event.target.value)} placeholder="Chèche..." /></label>
    <div className="table-scroll"><table className="payout-table"><thead><tr><th scope="col"><Localized text={"Kalite jwèt"}/></th><th scope="col">Aplike pa gwoup</th><th scope="col">Valè peman</th></tr></thead><tbody>
      {rows.filter(row => row.label.toLowerCase().includes(query.toLowerCase())).map(row => <tr key={row.label}>
        <th scope="row">{row.label}</th>
        <td>{["Palé", "Pick3 Box", "Pick4 Box", "Pick5 Box"].includes(row.group) && payoutRows.find(item => item.group === row.group)?.label === row.label && <Button variant="outline" type="button" onClick={() => groupApply(row.group, draft[row.label])}>Pou gwoup la</Button>}</td>
        <td><Input aria-label={"Tarif " + row.label} inputMode="decimal" value={draft[row.label]} aria-invalid={!valid(draft[row.label])} onChange={event => change(row.label, event.target.value)} /></td>
      </tr>)}
    </tbody></table></div>
    {!payoutRows.some(row => row.label.toLowerCase().includes(query.toLowerCase())) && <p className="payout-note">Pa gen kalite jwèt ki koresponn.</p>}
    <footer className="payout-footer"><span>{dirty ? "Chanjman poko valide" : "Pa gen chanjman annatant"}</span><Button variant="outline" disabled={!dirty} onClick={() => { setDraft({ ...defaultPayoutRates(), ...rates }); setMessage(""); }}><Localized text={"Anile chanjman"}/></Button><Button className="primary-action" disabled={!dirty} onClick={save}><Localized text={"Valide tarif yo"}/></Button></footer>
    {message && <p className="payout-note" role="status">{message}</p>}
  </section>;
}
