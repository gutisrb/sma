import React, { useState, useEffect, useCallback } from "react";
import {
  Upload, X, Film, Sparkles, Layers, Plus, Loader2, CheckCircle2,
  Home, DollarSign, MapPin, Ruler, Bed, Bath
} from "lucide-react";
import clsx from "clsx";

type Layout = "standard" | "premium";
interface Slot { id:string; file:File|null; url:string|null; }
interface Listing { title:string; price:string; location:string; size:string; beds:string; baths:string; extras:string[]; }

const WEBHOOK = import.meta.env.VITE_MAKE_WEBHOOK;

if (!WEBHOOK) {
  console.error('VITE_MAKE_WEBHOOK environment variable is not set');
}

export default function App() {
  const [layout,setLayout]=useState<Layout>("standard");
  const [slots,setSlots]=useState<Slot[]>([]);
  const [listing,setListing]=useState<Listing>({title:"",price:"",location:"",size:"",beds:"",baths:"",extras:[]});
  const [extra,setExtra]=useState(""); const [busy,setBusy]=useState(false); const [done,setDone]=useState(false);

  useEffect(()=>{ const n=layout==="premium"?7:5;
    setSlots(Array(n).fill(0).map((_,i)=>({id:`s${i}`,file:null,url:null}))); },[layout]);

  const addFiles=useCallback((files:File[],start:number)=>{
    setSlots(p=>{
      const next=[...p]; let i=start;
      files.forEach(f=>{
        while(i<next.length&&next[i].file)i++;
        if(i<next.length){ next[i]={...next[i],file:f,url:URL.createObjectURL(f) }; i++; }
      }); return next;
    });
  },[]);

  const swap=(a:number,b:number)=>setSlots(p=>{const n=[...p];[n[a],n[b]]=[n[b],n[a]];return n;});
  const clear=(i:number)=>setSlots(p=>p.map((s,idx)=>idx===i?({...s,file:null,url:null}):s));

  const generate=async()=>{
    if (!WEBHOOK) {
      alert('Webhook URL is not configured. Please set VITE_MAKE_WEBHOOK environment variable.');
      return;
    }
    
    const need=layout==="premium"?7:5;
    const filledSlots = slots.filter(s => s.file);
    if(filledSlots.length < need || !listing.title || !listing.price || !listing.location){
      alert(`Otpremite ${need} fotki i popunite obavezna polja.`); return;
    }
    setBusy(true);

    try {
      // Create FormData for multipart/form-data request
      const formData = new FormData();
      
      // Add all files with consistent naming
      slots.forEach((slot, index) => {
        if (slot.file) {
          formData.append(`image_${index}`, slot.file, slot.file.name);
        }
      });
      
      // Add listing data as individual fields (easier for Make.com to parse)
      formData.append('layout', layout);
      formData.append('title', listing.title);
      formData.append('price', listing.price);
      formData.append('location', listing.location);
      formData.append('size', listing.size);
      formData.append('beds', listing.beds);
      formData.append('baths', listing.baths);
      formData.append('extras', JSON.stringify(listing.extras));
      
      // Add grouping information for video layout
   const grouping = layout === "premium"
  ? [
      { files: [0, 1] },    // First keyframe pair
      { files: [2, 3] },    // Second keyframe pair  
      { files: [4] },       // Single image
      { files: [5] },       // Single image
      { files: [6] }        // Single image
    ]
        : slots.map((_, i) => ({ files: [i] }));
      
      formData.append('grouping', JSON.stringify(grouping));
      
      // Add metadata
      formData.append('timestamp', new Date().toISOString());
      formData.append('total_images', filledSlots.length.toString());

      console.log('Sending webhook with data:', {
        layout,
        listing,
        grouping,
        imageCount: filledSlots.length
      });
      
      // Send to webhook
      const response = await fetch(WEBHOOK, {
        method: 'POST',
        body: formData,
        // Don't set Content-Type header - let browser set it with boundary for multipart/form-data
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Webhook error response:', response.status, errorText);
        throw new Error(`Webhook failed with status ${response.status}: ${errorText}`);
      }
      
      const responseData = await response.text();
      console.log('Webhook success response:', responseData);
      
      setDone(true); setTimeout(()=>setDone(false),4000);
      
    } catch (error) {
      console.error('Webhook error:', error);
      alert(`Webhook error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setBusy(false);
    }
  };

  const label=(i:number)=>layout==="standard"?`Foto ${i+1}`:["1A","1B","2","3A","3B","4","5"][i];
  const kf=(i:number)=>layout==="premium"&&[0,1,3,4].includes(i);

  return(
  <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-indigo-50 via-white to-pink-50">
    <div className="max-w-xl mx-auto bg-white/90 backdrop-blur rounded-3xl shadow-2xl p-8 space-y-8">
      <header className="text-center space-y-2">
        <h1 className="text-3xl font-bold flex justify-center gap-2"><Film className="h-8 w-8 text-indigo-600"/>AI Video</h1>
        <p className="text-slate-500">Tri koraka do savršenog oglasa</p>
      </header>

      <Step title="1. Raspored">
        <div className="grid grid-cols-2 gap-4">
          <Card act={layout==="standard"} on={()=>setLayout("standard")} icon={<Layers className="h-6 w-6"/>} t="Standard" d="5 klipova"/>
          <Card act={layout==="premium"}  on={()=>setLayout("premium")}  icon={<Sparkles className="h-6 w-6 text-amber-500"/>} t="Premijum" d="Keyframe"/>
        </div>
      </Step>

      <Step title="2. Fotografije">
        <div className="grid grid-cols-5 gap-1">
          {slots.map((s,i)=>(
            <div key={s.id}
              draggable={!!s.file}
              onDragStart={e=>e.dataTransfer.setData("idx",String(i))}
              onDragOver={e=>e.preventDefault()}
              onDrop={e=>{
                e.preventDefault();
                const from=e.dataTransfer.getData("idx");
                if(from) swap(+from,i); else addFiles(Array.from(e.dataTransfer.files),i);
              }}
              className={clsx("relative border-2 border-dashed rounded-xl bg-slate-50 overflow-hidden flex items-center justify-center",
                "h-40 w-full min-w-[56px] max-w-[96px]")}
            >
              {s.url?(
                <>
                  <img src={s.url} className="absolute top-0 left-0 h-full w-full object-cover"/>
                  <button onClick={()=>clear(i)} className="absolute top-1 right-1 bg-white/80 p-0.5 rounded-full z-10" onPointerDown={e=>e.stopPropagation()}>
                    <X className="h-3 w-3"/>
                  </button>
                  <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-[10px] text-white px-1">{label(i)}</div>
                </>
              ):(
                <label className="flex flex-col items-center justify-center h-full w-full cursor-pointer">
                  <input type="file" multiple accept="image/*" className="hidden"
                    onChange={e=>addFiles(Array.from((e.target as HTMLInputElement).files||[]),i)}/>
                  <Upload className={clsx("h-6 w-6",kf(i)?"text-amber-500":"text-slate-400")}/>
                  <span className="text-[10px] mt-1">{label(i)}</span>
                </label>
              )}
            </div>
          ))}
        </div>
      </Step>

      <Step title="3. Detalji">
        <div className="grid sm:grid-cols-2 gap-4">
          <Inp icon={Home} v={listing.title}  s={v=>setListing({...listing,title:v})}  l="Naslov" p="Luksuzna vila"/>
          <Inp icon={DollarSign} v={listing.price}  s={v=>setListing({...listing,price:v})}  l="Cena" p="€450.000"/>
          <Inp icon={MapPin} v={listing.location}  s={v=>setListing({...listing,location:v})} l="Lokacija" p="Blok 21"/>
          <Inp icon={Ruler} v={listing.size}   s={v=>setListing({...listing,size:v})}  l="Površina" p="120"/>
          <Inp icon={Bed} v={listing.beds}   s={v=>setListing({...listing,beds:v})}  l="Sobe" p="3"/>
          <Inp icon={Bath} v={listing.baths}   s={v=>setListing({...listing,baths:v})}  l="Kupatila" p="2"/>
        </div>
        <div className="mt-3">
          <label className="text-sm">Pogodnosti</label>
          <div className="flex gap-2 mt-1">
            <input value={extra} onChange={e=>setExtra(e.target.value)} onKeyDown={e=>e.key==="Enter"&&pushExtra()}
              className="flex-1 px-3 py-2 border rounded-xl"/>
            <button onClick={pushExtra} className="bg-slate-200 px-3 rounded-lg"><Plus className="h-4 w-4"/></button>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {listing.extras.map((x,i)=>(
              <span key={i} className="flex items-center px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm">
                {x}<button onClick={()=>remExtra(i)}><X className="h-3 w-3 ml-1"/></button>
              </span>
            ))}
          </div>
        </div>
      </Step>

      <button onClick={generate} disabled={busy||done}
        className={clsx("w-full py-3 rounded-xl font-semibold flex justify-center gap-2",
          busy?"bg-slate-300 text-slate-500":done?"bg-green-500 text-white":"bg-indigo-600 text-white hover:bg-indigo-700")}>
        {busy?<><Loader2 className="h-5 w-5 animate-spin"/> Generišem…</>:
         done?<><CheckCircle2 className="h-5 w-5"/> Poslato!</>:
         <><Sparkles className="h-5 w-5"/> Generiši Video</>}
      </button>
    </div>
  </div>);

  function pushExtra(){ if(extra.trim()) setListing(l=>({...l,extras:[...l.extras,extra.trim()]})); setExtra(""); }
  function remExtra(i:number){ setListing(l=>({...l,extras:l.extras.filter((_,idx)=>idx!==i)})); }
}
const Step=({title,children}:{title:string;children:React.ReactNode})=>
  (<section className="space-y-3"><h2 className="font-bold">{title}</h2>{children}</section>);
const Card=({act,on,icon,t,d}:{act:boolean;on:()=>void;icon:React.ReactNode;t:string;d:string})=>
  (<button onClick={on} className={clsx("p-4 rounded-xl border-2 space-y-1",act?"border-indigo-600 bg-indigo-50":"border-slate-200 bg-white hover:border-indigo-300")}>
    <div className="flex gap-2 font-bold">{icon}{t}</div><p className="text-sm">{d}</p>
  </button>);
const Inp=({icon:Icon,l,p,v,s}:{icon:React.ElementType;l:string;p:string;v:string;s:(x:string)=>void})=>
  (<div className="space-y-1">
    <label className="text-sm">{l}</label>
    <div className="relative">
      <Icon className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
      <input value={v} onChange={e=>s(e.target.value)} placeholder={p}
        className="w-full pl-10 pr-3 py-2 border rounded-xl bg-white/70"/>
    </div>
  </div>);
