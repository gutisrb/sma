import React, { useState, useEffect, useCallback } from "react";
import {
  Upload, X, Film, Sparkles, Layers, Plus, Loader2, CheckCircle2,
  Home, DollarSign, MapPin, Ruler, Bed, Bath, Link2
} from "lucide-react";
import clsx from "clsx";

type Layout = "standard" | "custom";
interface Slot { id:string; file:File|null; url:string|null; }
interface Group { id: string; slots: Slot[]; }
interface Listing { title:string; price:string; location:string; size:string; beds:string; baths:string; extras:string[]; }

const WEBHOOK = import.meta.env.VITE_MAKE_WEBHOOK;

if (!WEBHOOK) {
  console.error('VITE_MAKE_WEBHOOK environment variable is not set');
}

export default function App() {
  const [layout,setLayout]=useState<Layout>("standard");
  const [groups,setGroups]=useState<Group[]>([]);
  const [listing,setListing]=useState<Listing>({title:"",price:"",location:"",size:"",beds:"",baths:"",extras:[]});
  const [extra,setExtra]=useState(""); 
  const [busy,setBusy]=useState(false); 
  const [done,setDone]=useState(false);
  const [draggedGroup, setDraggedGroup] = useState<string | null>(null);

  useEffect(() => {
    // Initialize with 7 separate groups (each with one slot)
    setGroups(Array(7).fill(0).map((_, i) => ({
      id: `g${i}`,
      slots: [{id: `s${i}`, file: null, url: null}]
    })));
  }, []);

  const addFiles = useCallback((files: File[], groupId: string, slotIndex: number) => {
    setGroups(prev => {
      const newGroups = [...prev];
      const groupIndex = newGroups.findIndex(g => g.id === groupId);
      if (groupIndex === -1) return prev;
      
      let fileIndex = 0;
      // First fill the specific slot
      if (fileIndex < files.length && !newGroups[groupIndex].slots[slotIndex].file) {
        newGroups[groupIndex].slots[slotIndex] = {
          ...newGroups[groupIndex].slots[slotIndex],
          file: files[fileIndex],
          url: URL.createObjectURL(files[fileIndex])
        };
        fileIndex++;
      }
      
      // Then fill any empty slots in the same group
      for (let i = 0; i < newGroups[groupIndex].slots.length && fileIndex < files.length; i++) {
        if (!newGroups[groupIndex].slots[i].file) {
          newGroups[groupIndex].slots[i] = {
            ...newGroups[groupIndex].slots[i],
            file: files[fileIndex],
            url: URL.createObjectURL(files[fileIndex])
          };
          fileIndex++;
        }
      }
      
      // Then fill empty slots in other groups
      for (let g = 0; g < newGroups.length && fileIndex < files.length; g++) {
        for (let s = 0; s < newGroups[g].slots.length && fileIndex < files.length; s++) {
          if (!newGroups[g].slots[s].file) {
            newGroups[g].slots[s] = {
              ...newGroups[g].slots[s],
              file: files[fileIndex],
              url: URL.createObjectURL(files[fileIndex])
            };
            fileIndex++;
          }
        }
      }
      
      return newGroups;
    });
  }, []);

  const clearSlot = (groupId: string, slotIndex: number) => {
    setGroups(prev => prev.map(group => 
      group.id === groupId 
        ? {
            ...group,
            slots: group.slots.map((slot, idx) => 
              idx === slotIndex ? {id: slot.id, file: null, url: null} : slot
            )
          }
        : group
    ));
  };

  const mergeGroups = (fromId: string, toId: string) => {
    if (fromId === toId) return;
    
    setGroups(prev => {
      const fromGroup = prev.find(g => g.id === fromId);
      const toGroup = prev.find(g => g.id === toId);
      if (!fromGroup || !toGroup) return prev;
      
      // Don't allow more than 2 images in a keyframe
      if (toGroup.slots.length + fromGroup.slots.length > 2) {
        alert("Keyframes can only have 2 images maximum");
        return prev;
      }
      
      // Merge the groups
      const newGroups = prev.filter(g => g.id !== fromId).map(g => 
        g.id === toId 
          ? {...g, slots: [...g.slots, ...fromGroup.slots]}
          : g
      );
      
      return newGroups;
    });
  };

  const splitGroup = (groupId: string) => {
    setGroups(prev => {
      const groupIndex = prev.findIndex(g => g.id === groupId);
      if (groupIndex === -1 || prev[groupIndex].slots.length === 1) return prev;
      
      const group = prev[groupIndex];
      const newGroups = [...prev];
      
      // Replace the group with individual groups for each slot
      newGroups.splice(groupIndex, 1, ...group.slots.map((slot, i) => ({
        id: `${group.id}_split_${i}`,
        slots: [slot]
      })));
      
      return newGroups;
    });
  };

  const generate = async () => {
    if (!WEBHOOK) {
      alert('Webhook URL is not configured. Please set VITE_MAKE_WEBHOOK environment variable.');
      return;
    }
    
    const allSlots = groups.flatMap(g => g.slots);
    const filledSlots = allSlots.filter(s => s.file);
    
    if(filledSlots.length < 5 || !listing.title || !listing.price || !listing.location){
      alert(`Upload at least 5 photos and fill in required fields.`); 
      return;
    }
    
    setBusy(true);

    try {
      const formData = new FormData();
      
      // Add all files
      let imageIndex = 0;
      allSlots.forEach((slot) => {
        if (slot.file) {
          formData.append(`image_${imageIndex}`, slot.file, slot.file.name);
          imageIndex++;
        }
      });
      
      // Add listing data
      formData.append('layout', layout);
      formData.append('title', listing.title);
      formData.append('price', listing.price);
      formData.append('location', listing.location);
      formData.append('size', listing.size);
      formData.append('beds', listing.beds);
      formData.append('baths', listing.baths);
      formData.append('extras', JSON.stringify(listing.extras));
      
      // Create grouping based on actual groups
      let currentImageIndex = 0;
      const groupingData = groups
        .filter(g => g.slots.some(s => s.file))
        .map(group => {
          const fileCount = group.slots.filter(s => s.file).length;
          const indices = Array(fileCount).fill(0).map((_, i) => currentImageIndex + i);
          currentImageIndex += fileCount;
          return indices;
        });
      
      formData.append('grouping', JSON.stringify({ files: groupingData }));
      formData.append('timestamp', new Date().toISOString());
      formData.append('total_images', filledSlots.length.toString());
      
      const response = await fetch(WEBHOOK, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`Webhook failed with status ${response.status}`);
      }
      
      setDone(true); 
      setTimeout(()=>setDone(false),4000);
      
    } catch (error) {
      console.error('Webhook error:', error);
      alert(`Webhook error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setBusy(false);
    }
  };

  return(
  <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-indigo-50 via-white to-pink-50">
    <div className="max-w-xl mx-auto bg-white/90 backdrop-blur rounded-3xl shadow-2xl p-8 space-y-8">
      <header className="text-center space-y-2">
        <h1 className="text-3xl font-bold flex justify-center gap-2"><Film className="h-8 w-8 text-indigo-600"/>AI Video</h1>
        <p className="text-slate-500">Create perfect property videos</p>
      </header>

      <Step title="1. Layout">
        <div className="grid grid-cols-2 gap-4">
          <Card act={layout==="standard"} on={()=>setLayout("standard")} icon={<Layers className="h-6 w-6"/>} t="Standard" d="Individual clips"/>
          <Card act={layout==="custom"}  on={()=>setLayout("custom")}  icon={<Link2 className="h-6 w-6 text-amber-500"/>} t="Custom" d="Drag to group"/>
        </div>
        {layout === "custom" && (
          <p className="text-xs text-slate-500 mt-2 text-center">
            Drag images together to create smooth transitions (max 2 per group)
          </p>
        )}
      </Step>

      <Step title="2. Photos">
        <div className="space-y-2">
          {groups.map((group) => (
            <div 
              key={group.id}
              className={clsx(
                "relative border-2 rounded-xl p-2 transition-all",
                group.slots.length > 1 ? "border-amber-400 bg-amber-50" : "border-slate-200",
                draggedGroup && draggedGroup !== group.id && group.slots.length < 2 && "border-indigo-400 bg-indigo-50"
              )}
              onDragOver={(e) => {
                if (layout === "custom" && draggedGroup && draggedGroup !== group.id) {
                  e.preventDefault();
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (layout === "custom" && draggedGroup && draggedGroup !== group.id) {
                  mergeGroups(draggedGroup, group.id);
                  setDraggedGroup(null);
                }
              }}
            >
              <div className="flex gap-2 items-center">
                {group.slots.map((slot, slotIdx) => (
                  <div 
                    key={slot.id}
                    draggable={layout === "custom" && !!slot.file && group.slots.length === 1}
                    onDragStart={() => layout === "custom" && setDraggedGroup(group.id)}
                    onDragEnd={() => setDraggedGroup(null)}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => {
                      e.preventDefault();
                      e.stopPropagation();
                      const files = Array.from(e.dataTransfer.files);
                      if (files.length > 0) {
                        addFiles(files, group.id, slotIdx);
                      }
                    }}
                    className={clsx(
                      "relative border-2 border-dashed rounded-xl bg-slate-50 overflow-hidden flex items-center justify-center",
                      "h-32 w-full flex-1",
                      layout === "custom" && group.slots.length === 1 && slot.file && "cursor-move"
                    )}
                  >
                    {slot.url ? (
                      <>
                        <img src={slot.url} className="absolute inset-0 h-full w-full object-cover"/>
                        <button 
                          onClick={() => clearSlot(group.id, slotIdx)} 
                          className="absolute top-1 right-1 bg-white/90 p-1 rounded-full z-10 hover:bg-white"
                        >
                          <X className="h-4 w-4"/>
                        </button>
                      </>
                    ) : (
                      <label className="flex flex-col items-center justify-center h-full w-full cursor-pointer">
                        <input 
                          type="file" 
                          multiple 
                          accept="image/*" 
                          className="hidden"
                          onChange={e => addFiles(Array.from(e.target.files || []), group.id, slotIdx)}
                        />
                        <Upload className="h-8 w-8 text-slate-400"/>
                        <span className="text-xs mt-1 text-slate-500">Upload</span>
                      </label>
                    )}
                  </div>
                ))}
                {layout === "custom" && group.slots.length > 1 && (
                  <button 
                    onClick={() => splitGroup(group.id)}
                    className="p-2 text-amber-600 hover:bg-amber-100 rounded-lg"
                    title="Split keyframe"
                  >
                    <X className="h-4 w-4"/>
                  </button>
                )}
              </div>
              {group.slots.length > 1 && (
                <div className="text-xs text-amber-600 text-center mt-1">
                  Keyframe transition
                </div>
              )}
            </div>
          ))}
        </div>
      </Step>

      <Step title="3. Property Info">
        <div className="space-y-4">
          <Field icon={<Home className="h-4 w-4"/>} placeholder="Property title" value={listing.title} onChange={e=>setListing({...listing,title:e.target.value})}/>
          <div className="grid grid-cols-2 gap-4">
            <Field icon={<DollarSign className="h-4 w-4"/>} placeholder="Price" value={listing.price} onChange={e=>setListing({...listing,price:e.target.value})}/>
            <Field icon={<MapPin className="h-4 w-4"/>} placeholder="Location" value={listing.location} onChange={e=>setListing({...listing,location:e.target.value})}/>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Field icon={<Ruler className="h-4 w-4"/>} placeholder="Size" value={listing.size} onChange={e=>setListing({...listing,size:e.target.value})}/>
            <Field icon={<Bed className="h-4 w-4"/>} placeholder="Beds" value={listing.beds} onChange={e=>setListing({...listing,beds:e.target.value})}/>
            <Field icon={<Bath className="h-4 w-4"/>} placeholder="Baths" value={listing.baths} onChange={e=>setListing({...listing,baths:e.target.value})}/>
          </div>
          <div className="space-y-2">
            <div className="flex gap-2">
              <Field icon={<Plus className="h-4 w-4"/>} placeholder="Add feature" value={extra} onChange={e=>setExtra(e.target.value)} onKeyPress={e=>e.key==='Enter'&&extra&&(setListing({...listing,extras:[...listing.extras,extra]}),setExtra(''))}/>
              <button onClick={()=>extra&&(setListing({...listing,extras:[...listing.extras,extra]}),setExtra(''))} className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200">Add</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {listing.extras.map((e,i)=>(
                <span key={i} className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 rounded-full text-sm">
                  {e}
                  <button onClick={()=>setListing({...listing,extras:listing.extras.filter((_,idx)=>idx!==i)})} className="text-slate-500 hover:text-slate-700">
                    <X className="h-3 w-3"/>
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>
      </Step>

      <button onClick={generate} disabled={busy} className={clsx("w-full py-4 rounded-2xl font-semibold text-white transition-all flex items-center justify-center gap-2",
        busy?"bg-slate-400":"bg-gradient-to-r from-indigo-600 to-purple-600 hover:shadow-xl")}>
        {busy?<><Loader2 className="h-5 w-5 animate-spin"/>Processing...</>:
         done?<><CheckCircle2 className="h-5 w-5"/>Done!</>:
         "Generate Video"}
      </button>
    </div>
  </div>
  );
}

function Step({title,children}:{title:string;children:React.ReactNode}){
  return(
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-slate-800">{title}</h2>
      {children}
    </div>
  );
}

function Card({act,on,icon,t,d}:{act:boolean;on:()=>void;icon:React.ReactNode;t:string;d:string}){
  return(
    <button onClick={on} className={clsx("p-6 rounded-2xl border-2 transition-all text-left space-y-2",
      act?"border-indigo-500 bg-indigo-50 shadow-lg":"border-slate-200 hover:border-slate-300")}>
      <div className={clsx("p-3 rounded-xl inline-block",act?"bg-indigo-100 text-indigo-700":"bg-slate-100 text-slate-600")}>{icon}</div>
      <h3 className="font-semibold text-slate-800">{t}</h3>
      <p className="text-sm text-slate-500">{d}</p>
    </button>
  );
}

function Field({icon,placeholder,value,onChange,onKeyPress}:{icon:React.ReactNode;placeholder:string;value:string;onChange:(e:React.ChangeEvent<HTMLInputElement>)=>void;onKeyPress?:(e:React.KeyboardEvent<HTMLInputElement>)=>void}){
  return(
    <div className="relative">
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{icon}</div>
      <input type="text" placeholder={placeholder} value={value} onChange={onChange} onKeyPress={onKeyPress}
        className="w-full pl-10 pr-4 py-3 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"/>
    </div>
  );
}