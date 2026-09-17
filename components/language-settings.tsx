"use client";
import {printerPaper,savePrinterPaper,type PaperWidth} from "@/lib/printer-settings";
import {createContext,useContext,useEffect,useState} from "react";
import {languageNames,translate,type Language} from "@/lib/languages";
import {Dialog,DialogContent,DialogHeader,DialogTitle} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";
const Context=createContext({language:"ht" as Language,save:(_language:Language)=>{}});
export function LanguageProvider({children}:{children:React.ReactNode}){
 const [language,setLanguage]=useState<Language>("ht");
 useEffect(()=>{try{const saved=localStorage.getItem("gespro-language-Gespro123");if(saved&&Object.hasOwn(languageNames,saved))setLanguage(saved as Language)}catch{}},[]);
 useEffect(()=>{document.documentElement.lang=language},[language]);
 function save(value:Language){setLanguage(value);try{localStorage.setItem("gespro-language-Gespro123",value)}catch{}}
 return <Context.Provider value={{language,save}}>{children}</Context.Provider>
}
export function Localized({text}:{text:string|number}){const {language}=useContext(Context);return <>{typeof text==="string"?translate(text,language):text}</>}
export function LanguageSettings({open,onOpenChange}:{open:boolean;onOpenChange:(v:boolean)=>void}){
 const {language,save}=useContext(Context);const [draft,setDraft]=useState(language);const [paper,setPaper]=useState<PaperWidth>("80");const [native,setNative]=useState(false);
 useEffect(()=>{if(open){setDraft(language);setPaper(printerPaper());setNative(/GesProAndroid/.test(navigator.userAgent))}},[open,language]);
 return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle><Localized text="Configuration"/></DialogTitle></DialogHeader><fieldset><legend><Localized text="Lang"/></legend><div className="language-options">{Object.entries(languageNames).map(([code,name])=><label key={code}><input type="radio" name="language" value={code} checked={draft===code} onChange={()=>setDraft(code as Language)}/>{name}</label>)}</div></fieldset><fieldset className="printer-settings"><legend>Enprimant</legend><label>Lajè papye<select value={paper} onChange={e=>setPaper(e.target.value as PaperWidth)}><option value="58">58 mm — ti POS / SUNMI V2</option><option value="80">80 mm — printer tikè</option><option value="a4">A4 / Letter — printer biwo</option></select></label><p>Peze Enprime sou tikè a, epi chwazi printer ki enstale a nan fenèt sistèm nan. Si li pa parèt, verifye koneksyon an ak sèvis / chofè printer la. Ou ka chwazi Sove kòm PDF tou.</p>{native&&<Button variant="outline" onClick={()=>{window.location.href="gespro-settings://printers"}}>Paramèt printer Android</Button>}</fieldset><div className="language-actions"><Button variant="outline" onClick={()=>onOpenChange(false)}><Localized text="Anile"/></Button><Button onClick={()=>{save(draft);savePrinterPaper(paper);onOpenChange(false)}}><Localized text="Sove chanjman"/></Button></div></DialogContent></Dialog>
}

export function LanguageLauncher(){const [open,setOpen]=useState(false);return <><Button variant="outline" onClick={()=>setOpen(true)}><Localized text="Lang"/></Button><LanguageSettings open={open} onOpenChange={setOpen}/></>}
