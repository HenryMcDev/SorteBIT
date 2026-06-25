import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Sparkles, Check, Smile, Scissors } from "lucide-react";
import { createAvatar } from "@dicebear/core";
import { avataaars } from "@dicebear/collection";

// Types
type Gender = "masculino" | "feminino";

// Configurations
const SKIN_TONES = [
  { name: "Pálido", hex: "#f8d5c4" },
  { name: "Claro", hex: "#f3b796" },
  { name: "Pêssego", hex: "#eed9c4" },
  { name: "Bronzeado Claro", hex: "#e0a58a" },
  { name: "Bronzeado", hex: "#d3906c" },
  { name: "Moreno", hex: "#c5825b" },
  { name: "Escuro", hex: "#97583a" },
  { name: "Ébano", hex: "#7a3e20" },
  { name: "Retinto", hex: "#5c2a14" },
];

const HAIR_COLORS = [
  { name: "Preto", hex: "#2c1b18" },
  { name: "Castanho Escuro", hex: "#4a3728" },
  { name: "Castanho Claro", hex: "#775d40" },
  { name: "Loiro", hex: "#b58135" },
  { name: "Loiro Claro", hex: "#e8c170" },
  { name: "Ruivo", hex: "#c84b31" },
  { name: "Platinado", hex: "#ecf0f1" },
  { name: "Azul", hex: "#0f4c81" },
];

const CLOTHING_COLORS = [
  { name: "Azul BIT", hex: "#2660a4" },
  { name: "Roxo", hex: "#5e2b97" },
  { name: "Verde", hex: "#2a7b4c" },
  { name: "Vermelho", hex: "#a8201a" },
  { name: "Laranja", hex: "#e06a3b" },
  { name: "Preto", hex: "#2b2b2a" },
  { name: "Cinza", hex: "#7f8c8d" },
  { name: "Branco", hex: "#ffffff" },
];

// Top variants list for DiceBear avataaars
const HAIR_STYLES = [
  { id: "shortRound", label: "Curto Redondo", gender: "masculino" },
  { id: "caesar", label: "César", gender: "masculino" },
  { id: "dreads", label: "Dreads", gender: "masculino" },
  { id: "fro", label: "Afro Puff", gender: "masculino" },
  { id: "curly", label: "Curto Cacheado", gender: "masculino" },
  { id: "frizzle", label: "Flattop", gender: "masculino" },
  { id: "longHair", label: "Longo Liso", gender: "feminino" },
  { id: "bun", label: "Coque", gender: "feminino" },
  { id: "bigHair", label: "Cabelo Cacheado Longo", gender: "feminino" },
];

const CLOTHING_STYLES = [
  { id: "graphicShirt", label: "Camiseta" },
  { id: "hoodie", label: "Moletom" },
  { id: "collarAndSweater", label: "Gola E Suéter" },
  { id: "shirtVName", label: "Decote V" },
];

// Helper to check if color is dark for contrast calculations
const isDarkColor = (hex: string) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq < 135;
};

export default function AvatarCreator() {
  const [gender, setGender] = useState<Gender>("masculino");
  const [skinColor, setSkinColor] = useState("#eed9c4");
  const [hairColor, setHairColor] = useState("#2c1b18");
  const [hairStyle, setHairStyle] = useState("shortRound");
  const [clothingStyle, setClothingStyle] = useState("graphicShirt");
  const [clothingColor, setClothingColor] = useState("#2660a4");
  const [hasGlasses, setHasGlasses] = useState(true);
  const [activeTab, setActiveTab] = useState<"visual" | "cores">("visual");

  const isDarkSkin = isDarkColor(skinColor);

  // Auto-switch default hair style on gender toggle for better UX
  const handleGenderChange = (newGender: Gender) => {
    setGender(newGender);
    if (newGender === "masculino") {
      setHairStyle("shortRound");
    } else {
      setHairStyle("longHair");
    }
  };

  // Instantiate local avatar generation and build avatarDataUrl
  const avatarInstance = createAvatar(avataaars, {
    top: [hairStyle as any],
    skinColor: [skinColor.replace("#", "")],
    hairColor: [hairColor.replace("#", "")],
    clothing: [clothingStyle as any],
    clothesColor: [clothingColor.replace("#", "")],
    accessories: ["prescription01"],
    accessoriesProbability: hasGlasses ? 100 : 0,
    facialHairProbability: 0,
    backgroundColor: ["transparent"],
  });

  const avatarDataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(avatarInstance.toString())}`;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 flex flex-col font-sans transition-colors duration-300">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 transition-colors">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2 text-sm font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Link>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-school-blue-500 animate-pulse" />
            <h1 className="text-lg font-bold bg-gradient-to-r from-school-blue-600 to-indigo-600 dark:from-school-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
              Criador de Avatar
            </h1>
          </div>
          <div className="w-16"></div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-8 flex flex-col md:flex-row gap-8 items-center md:items-start justify-center">
        
        {/* Left Section: Avatar Display */}
        <div className="w-full md:w-1/2 flex flex-col items-center">
          <div className="relative w-72 h-72 md:w-80 md:h-80 rounded-3xl border-2 border-zinc-200/80 dark:border-zinc-800/80 shadow-2xl flex items-center justify-center p-6 overflow-hidden backdrop-blur-sm group">
            
            {/* Ambient studio glow */}
            <div 
              className={`absolute w-56 h-56 rounded-full blur-3xl transition-all duration-500 pointer-events-none z-0 ${
                isDarkSkin 
                  ? "bg-amber-200/35 dark:bg-white/10 scale-110" 
                  : "bg-school-blue-500/10 dark:bg-zinc-800/30 scale-95"
              }`} 
            />
            
            {/* Neutral isolation circle */}
            <div className="absolute w-[85%] h-[85%] rounded-full bg-slate-100/90 dark:bg-zinc-800/60 border border-slate-200/60 dark:border-zinc-700/50 shadow-inner flex items-center justify-center z-10 transition-colors duration-300">
              
              {/* Inner dynamic soft lighting */}
              <div 
                className={`absolute w-36 h-36 rounded-full blur-xl transition-all duration-500 pointer-events-none z-0 ${
                  isDarkSkin
                    ? "bg-white/30 dark:bg-white/10"
                    : "bg-zinc-950/5 dark:bg-black/20"
                }`}
              />

              {/* DiceBear Avatar Image */}
              <img
                src={avatarDataUrl}
                alt="Avatar Customizado"
                className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105 z-10 select-none"
                crossOrigin="anonymous"
                loading="eager"
              />

              {/* Absolute Overlay Logo - "BIT" Brand stamp on Chest */}
              <div 
                className="absolute top-[73%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none"
                style={{ transform: "translate(-50%, -50%) scale(var(--logo-scale, 1))" }}
              >
                <span 
                  className={`text-xs md:text-sm font-black tracking-widest select-none ${
                    isDarkColor(clothingColor) ? "text-white/90 drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.6)]" : "text-zinc-900/90 drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]"
                  }`}
                >
                  BIT
                </span>
              </div>

            </div>
          </div>
          <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400 font-medium">
            Alimentado pela API Oficial DiceBear Avataaars
          </p>
        </div>

        {/* Right Section: Interactive customization controls */}
        <div className="w-full md:w-1/2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-3xl shadow-lg flex flex-col gap-5">
          
          {/* Navigation Tabs */}
          <div className="flex border-b border-zinc-200 dark:border-zinc-800 pb-1">
            <button
              onClick={() => setActiveTab("visual")}
              className={`flex-1 py-2 text-sm font-bold border-b-2 transition-all flex items-center justify-center gap-2 ${
                activeTab === "visual"
                  ? "border-school-blue-500 text-school-blue-600 dark:text-school-blue-400"
                  : "border-transparent text-zinc-400 dark:text-zinc-500 hover:text-zinc-600"
              }`}
            >
              <Scissors className="w-4 h-4" /> Estilos
            </button>
            <button
              onClick={() => setActiveTab("cores")}
              className={`flex-1 py-2 text-sm font-bold border-b-2 transition-all flex items-center justify-center gap-2 ${
                activeTab === "cores"
                  ? "border-school-blue-500 text-school-blue-600 dark:text-school-blue-400"
                  : "border-transparent text-zinc-400 dark:text-zinc-500 hover:text-zinc-600"
              }`}
            >
              <Smile className="w-4 h-4" /> Paletas
            </button>
          </div>

          {activeTab === "visual" ? (
            <div className="flex flex-col gap-4">
              {/* Gender selector */}
              <div>
                <label className="text-xs font-black uppercase text-zinc-400 tracking-wider">Gênero</label>
                <div className="flex gap-2 mt-1.5">
                  <button
                    onClick={() => handleGenderChange("masculino")}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                      gender === "masculino"
                        ? "bg-school-blue-500/10 border-school-blue-500 text-school-blue-600 dark:text-school-blue-400 font-extrabold"
                        : "bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-500"
                    }`}
                  >
                    Masculino
                  </button>
                  <button
                    onClick={() => handleGenderChange("feminino")}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                      gender === "feminino"
                        ? "bg-school-blue-500/10 border-school-blue-500 text-school-blue-600 dark:text-school-blue-400 font-extrabold"
                        : "bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-500"
                    }`}
                  >
                    Feminino
                  </button>
                </div>
              </div>

              {/* Hair Style selector */}
              <div>
                <label className="text-xs font-black uppercase text-zinc-400 tracking-wider">Estilo de Cabelo</label>
                <div className="grid grid-cols-2 gap-2 mt-1.5">
                  {HAIR_STYLES.filter((style) => style.gender === gender).map((style) => (
                    <button
                      key={style.id}
                      onClick={() => setHairStyle(style.id)}
                      className={`py-2 px-3 rounded-xl text-xs border font-medium truncate ${
                        hairStyle === style.id
                          ? "bg-zinc-100 dark:bg-zinc-800 border-zinc-800 dark:border-zinc-200 font-bold"
                          : "border-zinc-200 dark:border-zinc-800"
                      }`}
                    >
                      {style.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Clothing Style selector */}
              <div>
                <label className="text-xs font-black uppercase text-zinc-400 tracking-wider">Estilo de Roupa</label>
                <div className="grid grid-cols-2 gap-2 mt-1.5">
                  {CLOTHING_STYLES.map((style) => (
                    <button
                      key={style.id}
                      onClick={() => setClothingStyle(style.id)}
                      className={`py-2 px-3 rounded-xl text-xs border font-medium capitalize truncate ${
                        clothingStyle === style.id
                          ? "bg-zinc-100 dark:bg-zinc-800 border-zinc-800 dark:border-zinc-200 font-bold"
                          : "border-zinc-200 dark:border-zinc-800"
                      }`}
                    >
                      {style.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Accessories toggle */}
              <div className="flex items-center justify-between py-2 border-t border-zinc-200 dark:border-zinc-800 mt-2">
                <span className="text-xs font-black uppercase text-zinc-400 tracking-wider">Óculos</span>
                <button
                  onClick={() => setHasGlasses(!hasGlasses)}
                  className={`w-12 h-6 rounded-full p-1 transition-colors duration-250 ${
                    hasGlasses ? "bg-school-blue-500" : "bg-zinc-300 dark:bg-zinc-700"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform duration-250 ${
                      hasGlasses ? "translate-x-6" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {/* Skin Tone Selector */}
              <div>
                <label className="text-xs font-black uppercase text-zinc-400 tracking-wider">Tom de Pele</label>
                <div className="grid grid-cols-5 gap-2 mt-2">
                  {SKIN_TONES.map((tone) => {
                    const isSelected = skinColor.toLowerCase() === tone.hex.toLowerCase();
                    return (
                      <button
                        key={tone.hex}
                        onClick={() => setSkinColor(tone.hex)}
                        className={`relative aspect-square w-full rounded-full border transition-all duration-200 active:scale-90 flex items-center justify-center ${
                          isSelected
                            ? "border-school-blue-500 ring-2 ring-school-blue-500/35"
                            : "border-zinc-300 dark:border-zinc-700"
                        }`}
                        style={{ backgroundColor: tone.hex }}
                        title={tone.name}
                      >
                        {isSelected && (
                          <span className="bg-black/40 text-white rounded-full p-0.5 shadow-md">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Hair Color Selector */}
              <div>
                <label className="text-xs font-black uppercase text-zinc-400 tracking-wider">Cor do Cabelo</label>
                <div className="grid grid-cols-8 gap-1.5 mt-2">
                  {HAIR_COLORS.map((color) => {
                    const isSelected = hairColor.toLowerCase() === color.hex.toLowerCase();
                    return (
                      <button
                        key={color.hex}
                        onClick={() => setHairColor(color.hex)}
                        className={`relative aspect-square w-full rounded-full border transition-all duration-200 active:scale-90 flex items-center justify-center ${
                          isSelected
                            ? "border-zinc-900 dark:border-white ring-2 ring-zinc-500/20"
                            : "border-zinc-350 dark:border-zinc-700"
                        }`}
                        style={{ backgroundColor: color.hex }}
                        title={color.name}
                      >
                        {isSelected && (
                          <span className="bg-white/40 dark:bg-black/40 text-white rounded-full p-0.5 shadow-md">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Clothing Color Selector */}
              <div>
                <label className="text-xs font-black uppercase text-zinc-400 tracking-wider">Cor da Roupa</label>
                <div className="grid grid-cols-8 gap-1.5 mt-2">
                  {CLOTHING_COLORS.map((color) => {
                    const isSelected = clothingColor.toLowerCase() === color.hex.toLowerCase();
                    return (
                      <button
                        key={color.hex}
                        onClick={() => setClothingColor(color.hex)}
                        className={`relative aspect-square w-full rounded-full border transition-all duration-200 active:scale-90 flex items-center justify-center ${
                          isSelected
                            ? "border-zinc-900 dark:border-white ring-2 ring-zinc-500/20"
                            : "border-zinc-350 dark:border-zinc-700"
                        }`}
                        style={{ backgroundColor: color.hex }}
                        title={color.name}
                      >
                        {isSelected && (
                          <span className="bg-white/40 dark:bg-black/40 text-white rounded-full p-0.5 shadow-md">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Confirm Button */}
          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 mt-2">
            <button
              onClick={() => {
                alert("Avatar salvo com sucesso!");
              }}
              className="w-full py-3 bg-gradient-to-r from-school-blue-600 to-indigo-600 hover:from-school-blue-700 hover:to-indigo-700 active:scale-[0.98] transition-all text-white font-bold rounded-xl shadow-md text-sm"
            >
              Salvar Alterações
            </button>
          </div>
        </div>

      </main>
    </div>
  );
}
