import React, { useState, useEffect, useCallback } from 'react';
import { Upload, X, Film, Sparkles, Layers, Plus, Loader2, CheckCircle2, Home, DollarSign, MapPin, Ruler, Bed, Bath, Image, Play } from 'lucide-react';

const WEBHOOK = "https://hook.eu2.make.com/your-webhook-here"; // Replace with actual webhook

interface Slot {
  id: string;
  mode: 'image-to-video' | 'frame-to-frame';
  file1: File | null;
  file2: File | null;
  url1: string | null;
  url2: string | null;
}

interface Listing {
  title: string;
  price: string;
  location: string;
  size: string;
  beds: string;
  baths: string;
  extras: string[];
}

export default function SmartflowApp() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [listing, setListing] = useState<Listing>({
    title: "", price: "", location: "", size: "", beds: "", baths: "", extras: []
  });
  const [extra, setExtra] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    setSlots(Array(5).fill(0).map((_, i) => ({
      id: `s${i}`,
      mode: 'image-to-video',
      file1: null,
      file2: null,
      url1: null,
      url2: null
    })));
  }, []);

  const updateSlot = useCallback((index: number, updates: Partial<Slot>) => {
    setSlots(prev => prev.map((slot, i) => 
      i === index ? { ...slot, ...updates } : slot
    ));
  }, []);

  const toggleMode = useCallback((index: number) => {
    const currentMode = slots[index].mode;
    const newMode = currentMode === 'image-to-video' ? 'frame-to-frame' : 'image-to-video';
    updateSlot(index, {
      mode: newMode,
      file1: null,
      file2: null,
      url1: null,
      url2: null
    });
  }, [slots, updateSlot]);

  const handleFileUpload = useCallback((slotIndex: number, fileType: 'file1' | 'file2', file: File) => {
    if (!file) return;
    
    const url = URL.createObjectURL(file);
    updateSlot(slotIndex, {
      [fileType]: file,
      [fileType === 'file1' ? 'url1' : 'url2']: url
    });
  }, [updateSlot]);

  const clearSlot = useCallback((slotIndex: number) => {
    updateSlot(slotIndex, {
      file1: null,
      file2: null,
      url1: null,
      url2: null
    });
  }, [updateSlot]);

  const swapSlots = useCallback((fromIndex: number, toIndex: number) => {
    setSlots(prev => {
      const newSlots = [...prev];
      [newSlots[fromIndex], newSlots[toIndex]] = [newSlots[toIndex], newSlots[fromIndex]];
      return newSlots;
    });
  }, []);

  const generate = async () => {
    const filledSlots = slots.filter(s => s.file1);
    if (filledSlots.length < 5 || !listing.title || !listing.price || !listing.location) {
      alert("Otpremite 5 fotografija i popunite obavezna polja.");
      return;
    }

    setBusy(true);

    try {
      const formData = new FormData();
      
      // Add images - for frame-to-frame, send both images for the slot
      slots.forEach((slot, index) => {
        if (slot.file1) {
          formData.append(`image_${index}`, slot.file1, slot.file1.name);
        }
        if (slot.mode === 'frame-to-frame' && slot.file2) {
          formData.append(`image_${index}_end`, slot.file2, slot.file2.name);
        }
      });

      // Add slot modes so backend knows which are frame-to-frame
      const slotModes = slots.map(slot => slot.mode);
      formData.append('slot_modes', JSON.stringify(slotModes));
      
      // Add listing data (matching your current structure exactly)
      formData.append('layout', 'standard');
      formData.append('title', listing.title);
      formData.append('price', listing.price);
      formData.append('location', listing.location);
      formData.append('size', listing.size);
      formData.append('beds', listing.beds);
      formData.append('baths', listing.baths);
      formData.append('extras', JSON.stringify(listing.extras));
      
      // Add grouping (keeping your current structure)
      const grouping = slots.map((_, i) => ({ files: [i] }));
      formData.append('grouping', JSON.stringify(grouping));
      
      // Add metadata
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
      setTimeout(() => setDone(false), 4000);
      
    } catch (error) {
      console.error('Webhook error:', error);
      alert(`Greška: ${error instanceof Error ? error.message : 'Nepoznata greška'}`);
    } finally {
      setBusy(false);
    }
  };

  const pushExtra = () => {
    if (extra.trim()) {
      setListing(l => ({ ...l, extras: [...l.extras, extra.trim()] }));
      setExtra("");
    }
  };

  const remExtra = (i: number) => {
    setListing(l => ({ ...l, extras: l.extras.filter((_, idx) => idx !== i) }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <div className="bg-gray-900/50 backdrop-blur-sm border-b border-gray-700">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-cyan-400 to-teal-400 rounded-lg flex items-center justify-center">
                <Film className="text-gray-900" size={20} />
              </div>
              <h1 className="text-2xl font-bold text-white">smartflow</h1>
            </div>
            <div className="ml-auto">
              <span className="text-sm text-gray-400">AI Video Generisanje</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Step 1: Images */}
        <section className="space-y-6">
          <h2 className="text-xl font-semibold text-white">1. Fotografije</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {slots.map((slot, index) => (
              <div key={slot.id} className="bg-gray-800/30 backdrop-blur-sm rounded-xl p-4 border border-gray-700">
                {/* Mode Toggle */}
                <div className="mb-3">
                  <div className="flex bg-gray-700 rounded-lg p-1">
                    <button
                      onClick={() => toggleMode(index)}
                      className={`px-2 py-1 rounded text-xs font-medium transition-all flex-1 ${
                        slot.mode === 'image-to-video' 
                          ? 'bg-cyan-400 text-gray-900' 
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      <Image size={12} className="inline mr-1" />
                      Video
                    </button>
                    <button
                      onClick={() => toggleMode(index)}
                      className={`px-2 py-1 rounded text-xs font-medium transition-all flex-1 ${
                        slot.mode === 'frame-to-frame' 
                          ? 'bg-cyan-400 text-gray-900' 
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      <Play size={12} className="inline mr-1" />
                      Keyframe
                    </button>
                  </div>
                </div>

                {/* File Upload Areas */}
                <div className="space-y-2">
                  {/* First Image */}
                  <div className="relative group">
                    <input
                      type="file"
                      accept="image/*"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(index, 'file1', file);
                      }}
                    />
                    <div 
                      className={`w-full h-24 border-2 border-dashed rounded-lg transition-all duration-300 ${
                        slot.url1 ? 'border-cyan-400' : 'border-gray-600 hover:border-cyan-400'
                      } bg-gray-800/50 backdrop-blur-sm flex items-center justify-center relative overflow-hidden`}
                      draggable={!!slot.file1}
                      onDragStart={(e) => e.dataTransfer.setData("slotIndex", String(index))}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const fromIndex = e.dataTransfer.getData("slotIndex");
                        if (fromIndex && fromIndex !== String(index)) {
                          swapSlots(parseInt(fromIndex), index);
                        }
                      }}
                    >
                      {slot.url1 ? (
                        <>
                          <img src={slot.url1} alt="Slika 1" className="w-full h-full object-cover rounded" />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              clearSlot(index);
                            }}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X size={12} />
                          </button>
                        </>
                      ) : (
                        <div className="text-center">
                          <Upload className="mx-auto mb-1 text-gray-400 group-hover:text-cyan-400" size={16} />
                          <p className="text-xs text-gray-400">
                            {slot.mode === 'frame-to-frame' ? 'Početni kadar' : `Foto ${index + 1}`}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Second Image (only for frame-to-frame) */}
                  {slot.mode === 'frame-to-frame' && (
                    <div className="relative group">
                      <input
                        type="file"
                        accept="image/*"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(index, 'file2', file);
                        }}
                      />
                      <div className={`w-full h-24 border-2 border-dashed rounded-lg transition-all duration-300 ${
                          slot.url2 ? 'border-cyan-400' : 'border-gray-600 hover:border-cyan-400'
                        } bg-gray-800/50 backdrop-blur-sm flex items-center justify-center relative overflow-hidden`}
                      >
                        {slot.url2 ? (
                          <>
                            <img src={slot.url2} alt="Slika 2" className="w-full h-full object-cover rounded" />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                updateSlot(index, { file2: null, url2: null });
                              }}
                              className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X size={12} />
                            </button>
                          </>
                        ) : (
                          <div className="text-center">
                            <Upload className="mx-auto mb-1 text-gray-400 group-hover:text-cyan-400" size={16} />
                            <p className="text-xs text-gray-400">Završni kadar</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Step 2: Property Details */}
        <section className="space-y-6">
          <h2 className="text-xl font-semibold text-white">2. Detalji nekretnine</h2>
          
          <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                  <Home size={16} />
                  Naslov
                </label>
                <input
                  type="text"
                  value={listing.title}
                  onChange={(e) => setListing(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 transition-colors"
                  placeholder="Luksuzna vila"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                  <DollarSign size={16} />
                  Cena
                </label>
                <input
                  type="text"
                  value={listing.price}
                  onChange={(e) => setListing(prev => ({ ...prev, price: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 transition-colors"
                  placeholder="€450.000"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                  <MapPin size={16} />
                  Lokacija
                </label>
                <input
                  type="text"
                  value={listing.location}
                  onChange={(e) => setListing(prev => ({ ...prev, location: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 transition-colors"
                  placeholder="Vračar"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                  <Ruler size={16} />
                  Površina (m²)
                </label>
                <input
                  type="text"
                  value={listing.size}
                  onChange={(e) => setListing(prev => ({ ...prev, size: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 transition-colors"
                  placeholder="120"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                  <Bed size={16} />
                  Sobe
                </label>
                <input
                  type="text"
                  value={listing.beds}
                  onChange={(e) => setListing(prev => ({ ...prev, beds: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 transition-colors"
                  placeholder="3"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                  <Bath size={16} />
                  Kupatila
                </label>
                <input
                  type="text"
                  value={listing.baths}
                  onChange={(e) => setListing(prev => ({ ...prev, baths: e.target.value }))}
                  className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 transition-colors"
                  placeholder="2"
                />
              </div>
            </div>

            {/* Extras */}
            <div className="mt-6 space-y-3">
              <label className="text-sm font-medium text-gray-300">Pogodnosti</label>
              <div className="flex gap-2">
                <input
                  value={extra}
                  onChange={(e) => setExtra(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && pushExtra()}
                  className="flex-1 px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 transition-colors"
                  placeholder="Garaža, Terasa..."
                />
                <button
                  onClick={pushExtra}
                  className="bg-cyan-400 hover:bg-cyan-300 text-gray-900 px-4 rounded-lg transition-colors"
                >
                  <Plus size={20} />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {listing.extras.map((x, i) => (
                  <span key={i} className="flex items-center px-3 py-1 bg-cyan-400/20 text-cyan-400 rounded-full text-sm border border-cyan-400/30">
                    {x}
                    <button onClick={() => remExtra(i)} className="ml-2 hover:text-cyan-300">
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Generate Button */}
        <div className="text-center">
          <button
            onClick={generate}
            disabled={busy || done}
            className={`px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 ${
              busy || done
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-cyan-400 to-teal-400 text-gray-900 hover:from-cyan-300 hover:to-teal-300 transform hover:scale-105 shadow-lg hover:shadow-cyan-400/25'
            }`}
          >
            {busy ? (
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin" />
                Generišem video...
              </div>
            ) : done ? (
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5" />
                Poslato!
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5" />
                Generiši profesionalni video
              </div>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}