import React, { useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import {
  Activity, ArrowRight, Atom, BatteryCharging, Check, ChevronRight, CircleDollarSign,
  Cpu, Gauge, Globe2, Radio, Rocket, Satellite, ShieldCheck, Sparkles, Target,
  Users, Wifi, Zap, RotateCcw, Play, AlertTriangle, Trophy, X
} from "lucide-react";
import SpaceScene from "./SpaceScene.jsx";

const SERVER = import.meta.env.VITE_SERVER_URL || "http://localhost:4000";

const missions = [
  { id:"earth", name:"Earth Observation", type:"EARTH SCIENCE", desc:"Monitor climate, oceans and changing land surfaces.", objective:"Map global vegetation and ocean temperature", science:72, duration:3, orbit:"Polar", budget:115, difficulty:"Rookie", color:"cyan" },
  { id:"moon", name:"Lunar Reconnaissance", type:"LUNAR EXPLORATION", desc:"Survey the Moon and identify promising landing regions.", objective:"Map lunar surface minerals and landing hazards", science:88, duration:4, orbit:"Lunar", budget:165, difficulty:"Explorer", color:"violet" },
  { id:"mars", name:"Mars Pathfinder", type:"PLANETARY SCIENCE", desc:"Study the Martian atmosphere and surface chemistry.", objective:"Measure atmospheric composition and surface geology", science:100, duration:5, orbit:"Mars", budget:230, difficulty:"Expert", color:"orange" },
  { id:"climate", name:"Storm Watch", type:"WEATHER & CLIMATE", desc:"Track storm systems and atmospheric moisture.", objective:"Observe storm formation and cloud water content", science:78, duration:3, orbit:"LEO", budget:125, difficulty:"Rookie", color:"green" }
];

const components = {
  bus: [
    { id:"nano", name:"NanoSat Frame", mass:32, power:8, cost:12, reliability:72, desc:"Compact, affordable platform" },
    { id:"standard", name:"Standard Bus", mass:78, power:14, cost:25, reliability:88, desc:"Balanced modular spacecraft" },
    { id:"heavy", name:"Deep-Space Bus", mass:135, power:20, cost:48, reliability:94, desc:"Redundant systems for long missions" }
  ],
  power: [
    { id:"basicSolar", name:"Fixed Solar Array", mass:18, power:55, cost:12, reliability:78, desc:"Simple solar generation" },
    { id:"deployable", name:"Deployable Solar Wings", mass:32, power:105, cost:24, reliability:91, desc:"High-output deployable panels" },
    { id:"rtg", name:"Radioisotope Generator", mass:42, power:75, cost:52, reliability:96, desc:"Steady power beyond sunlight" }
  ],
  comms: [
    { id:"low", name:"Low-Gain Antenna", mass:5, power:4, cost:6, data:8, reliability:75, desc:"Basic telemetry and commands" },
    { id:"medium", name:"Medium-Gain Antenna", mass:11, power:8, cost:16, data:35, reliability:88, desc:"Balanced science downlink" },
    { id:"high", name:"High-Gain Dish", mass:22, power:14, cost:32, data:90, reliability:95, desc:"High-volume data transmission" }
  ],
  computer: [
    { id:"basic", name:"Flight Computer", mass:4, power:5, cost:8, reliability:78, desc:"Essential onboard processing" },
    { id:"rad", name:"Radiation-Hardened Computer", mass:8, power:8, cost:20, reliability:95, desc:"Robust deep-space processing" }
  ],
  propulsion: [
    { id:"coldgas", name:"Cold Gas Thrusters", mass:9, power:3, cost:8, reliability:82, desc:"Simple attitude and orbit tweaks" },
    { id:"chemical", name:"Chemical Propulsion", mass:24, power:8, cost:24, reliability:88, desc:"Higher impulse maneuvering" },
    { id:"electric", name:"Electric Propulsion", mass:18, power:12, cost:38, reliability:93, desc:"Efficient long-duration thrust" }
  ]
};

const instruments = [
  { id:"camera", name:"Multispectral Camera", category:"IMAGING", mass:12, power:18, cost:16, data:22, science:25, desc:"Captures visible and near-infrared imagery" },
  { id:"radar", name:"Synthetic Aperture Radar", category:"RADAR", mass:28, power:38, cost:34, data:42, science:34, desc:"Sees through clouds and darkness" },
  { id:"spectrometer", name:"Imaging Spectrometer", category:"SPECTROSCOPY", mass:17, power:24, cost:25, data:28, science:30, desc:"Identifies surface and atmospheric chemistry" },
  { id:"magnetometer", name:"Magnetometer", category:"FIELDS", mass:6, power:6, cost:10, data:5, science:16, desc:"Measures local magnetic fields" },
  { id:"thermal", name:"Thermal Imager", category:"THERMAL", mass:10, power:14, cost:14, data:16, science:20, desc:"Maps surface temperature patterns" },
  { id:"particle", name:"Particle Detector", category:"PLASMA", mass:8, power:12, cost:18, data:8, science:22, desc:"Studies energetic particles and radiation" }
];

const orbits = [
  { id:"LEO", name:"Low Earth Orbit", altitude:"300–1,000 km", coverage:60, comms:85, cost:10, suitable:["earth","climate"], desc:"Frequent passes and high-resolution observation." },
  { id:"Polar", name:"Sun-Synchronous / Polar", altitude:"600–850 km", coverage:96, comms:72, cost:18, suitable:["earth","climate"], desc:"Near-global coverage as Earth rotates below." },
  { id:"GEO", name:"Geostationary Orbit", altitude:"35,786 km", coverage:48, comms:98, cost:24, suitable:["earth","climate"], desc:"Continuous view of one broad region." },
  { id:"MEO", name:"Medium Earth Orbit", altitude:"2,000–20,000 km", coverage:76, comms:82, cost:20, suitable:["earth"], desc:"Wide-area coverage at intermediate altitude." },
  { id:"Lunar", name:"Lunar Orbit", altitude:"Around the Moon", coverage:88, comms:65, cost:38, suitable:["moon"], desc:"Repeated passes over lunar terrain." },
  { id:"Mars", name:"Mars Transfer / Orbit", altitude:"Interplanetary", coverage:80, comms:42, cost:58, suitable:["mars"], desc:"Long cruise and delayed communications." }
];

const launchers = [
  { id:"small", name:"Vega-C Class", capacity:250, cost:28, orbits:["LEO","Polar"], reliability:86, desc:"Small-to-medium payload launcher" },
  { id:"medium", name:"Falcon 9 Class", capacity:900, cost:48, orbits:["LEO","Polar","GEO","MEO"], reliability:94, desc:"Versatile medium/heavy launcher" },
  { id:"heavy", name:"Heavy-Lift Vehicle", capacity:1800, cost:78, orbits:["LEO","Polar","GEO","MEO","Lunar","Mars"], reliability:96, desc:"High-energy payload delivery" }
];

const roles = ["Mission Planner","Spacecraft Engineer","Science Lead","Flight Director"];
const money = n => `$${Math.round(n)}M`;
const initialConfig = mission => ({
  mission: mission.id, bus:"standard", power:"deployable", comms:"medium", computer:"basic",
  propulsion:"chemical", instruments:["camera","spectrometer"], orbit:mission.orbit,
  launcher: mission.id==="mars" ? "heavy" : mission.id==="moon" ? "medium" : "small"
});

function calculate(config, mission) {
  const selected = Object.values(components).flat().filter(c => Object.values(config).includes(c.id));
  const payload = instruments.filter(i => config.instruments.includes(i.id));
  const bus = components.bus.find(c=>c.id===config.bus);
  const power = components.power.find(c=>c.id===config.power);
  const comms = components.comms.find(c=>c.id===config.comms);
  const computer = components.computer.find(c=>c.id===config.computer);
  const propulsion = components.propulsion.find(c=>c.id===config.propulsion);
  const orbit = orbits.find(o=>o.id===config.orbit);
  const launcher = launchers.find(l=>l.id===config.launcher);
  const mass = bus.mass + power.mass + comms.mass + computer.mass + propulsion.mass + payload.reduce((s,i)=>s+i.mass,0);
  const powerNeed = bus.power + comms.power + computer.power + propulsion.power + payload.reduce((s,i)=>s+i.power,0);
  const powerSupply = power.power;
  const data = payload.reduce((s,i)=>s+i.data,0);
  const science = Math.min(100, mission.science * .25 + payload.reduce((s,i)=>s+i.science,0) * .8);
  const cost = bus.cost + power.cost + comms.cost + computer.cost + propulsion.cost + payload.reduce((s,i)=>s+i.cost,0) + orbit.cost + launcher.cost;
  const commCapacity = comms.data;
  const massOK = mass <= launcher.capacity;
  const orbitOK = launcher.orbits.includes(config.orbit);
  const budgetOK = cost <= mission.budget;
  const powerOK = powerSupply >= powerNeed;
  const dataOK = commCapacity >= data;
  const lifetime = Math.max(1, Math.round((power.reliability/25) + propulsion.reliability/40 + (mission.duration/2)));
  const reliability = Math.round((bus.reliability + power.reliability + comms.reliability + computer.reliability + propulsion.reliability + launcher.reliability)/6);
  return { mass,powerNeed,powerSupply,data,science,cost,commCapacity,massOK,orbitOK,budgetOK,powerOK,dataOK,lifetime,reliability,orbit,launcher,payload };
}

function Metric({ icon:Icon, label, value, sub, status }) {
  return <div className="metric"><div className="metric-top"><span>{label}</span><Icon size={15}/></div><strong>{value}</strong><small className={status || ""}>{sub}</small></div>;
}

function App() {
  const [screen,setScreen] = useState("welcome");
  const [mode,setMode] = useState("solo");
  const [name,setName] = useState("Commander");
  const [roomCode,setRoomCode] = useState("ORBIT4");
  const [role,setRole] = useState(roles[0]);
  const [players,setPlayers] = useState([]);
  const [selfId,setSelfId] = useState("");
  const [socket,setSocket] = useState(null);
  const [missionId,setMissionId] = useState("earth");
  const mission = missions.find(m=>m.id===missionId) || missions[0];
  const [config,setConfig] = useState(initialConfig(mission));
  const configRef = useRef(config);
  useEffect(() => { configRef.current = config; }, [config]);
  const [tab,setTab] = useState("overview");
  const [report,setReport] = useState(null);
  const [eventChoice,setEventChoice] = useState(null);
  const [notice,setNotice] = useState("");
  const [launched,setLaunched] = useState(false);

  const stats = useMemo(()=>calculate(config,mission),[config,mission]);
  const update = (key,value) => setConfig(prev=>({...prev,[key]:value}));
  const toggleInstrument = id => update("instruments",config.instruments.includes(id) ? config.instruments.filter(x=>x!==id) : [...config.instruments,id]);

  useEffect(()=>{
    if (!socket) return;
    socket.on("room:joined",({selfId:id})=>setSelfId(id));
    socket.on("room:update",room=>{
      setPlayers(room.players || []);
      if (room.config) {
        setConfig(previous => JSON.stringify(previous) === JSON.stringify(room.config) ? previous : room.config);
      }
      if (room.report) setReport(room.report);
    });
    socket.on("room:error",msg=>setNotice(msg));
    return ()=>{socket.off("room:update");socket.off("room:joined");socket.off("room:error");};
  },[socket]);

  const joinRoom = () => {
    const s = io(SERVER);
    setSocket(s);
    s.emit("room:join",{code:roomCode,name,role});
    setMode("team");
    setScreen("mission");
  };

  useEffect(()=>{
    if (socket && screen==="mission") socket.emit("mission:update",config);
  },[config,socket,screen]);

  const chooseMission = id => {
    const m = missions.find(x=>x.id===id);
    setMissionId(id);
    setConfig(initialConfig(m));
    setReport(null);
    setLaunched(false);
  };

  const runSimulation = () => {
    const checks = [stats.massOK,stats.orbitOK,stats.budgetOK,stats.powerOK,stats.dataOK];
    const engineering = checks.filter(Boolean).length / checks.length;
    const missionMatch = stats.orbit.suitable.includes(mission.id) ? 1 : .55;
    const raw = Math.round((stats.science*.38 + stats.reliability*.24 + stats.orbit.coverage*.16 + engineering*100*.22) * missionMatch);
    const score = Math.max(0,Math.min(100,raw));
    const success = score >= 65 && engineering >= .6;
    const events = [
      { title:"Micrometeoroid Alert", text:"A small debris impact threatens one solar-array string.", options:[{label:"Isolate damaged string",effect:2,detail:"Power margin reduced slightly, bus remains stable."},{label:"Attempt autonomous repair",effect:6,detail:"Risky recovery improves available power."}] },
      { title:"Unexpected Science Opportunity", text:"The spacecraft detects an unusual signal during a scheduled pass.", options:[{label:"Collect additional data",effect:5,detail:"Science return improves, data storage fills faster."},{label:"Stay on the planned schedule",effect:1,detail:"Protects resources and keeps the timeline stable."}] },
      { title:"Communications Window Shift", text:"Ground station visibility is shorter than predicted.", options:[{label:"Prioritize critical telemetry",effect:4,detail:"Essential mission data is preserved."},{label:"Transmit full science package",effect:-3,detail:"Higher science return, but link margin is strained."}] }
    ];
    const event = events[Math.floor(Math.random()*events.length)];
    setEventChoice({event,score,success,engineering});
    setLaunched(true);
    setTab("simulation");
  };

  const resolveEvent = option => {
    const finalScore = Math.max(0,Math.min(100,eventChoice.score + option.effect));
    // Mission risk is determined by engineering readiness, not the score alone.
    // If all engineering constraints pass, a lower score means "needs improvement",
    // not "at risk". Event choices such as staying on schedule do not create risk.
    const atRisk = eventChoice.engineering < .6;
    const finalSuccess = !atRisk;
    const performanceTitle = atRisk
      ? "MISSION AT RISK"
      : finalScore >= 65
        ? "MISSION OBJECTIVES ACHIEVED"
        : "MISSION NEEDS IMPROVEMENT";
    const finalReport = {
      score:finalScore, success:finalSuccess, title:performanceTitle,
      science:stats.science, mass:stats.mass, cost:stats.cost, power:stats.powerNeed,
      powerSupply:stats.powerSupply, data:stats.data, commCapacity:stats.commCapacity,
      reliability:stats.reliability, checks:[
        ["Payload mass",stats.massOK,`${stats.mass} / ${stats.launcher.capacity} kg`],
        ["Orbit compatibility",stats.orbitOK,stats.orbit.name],
        ["Budget",stats.budgetOK,`${money(stats.cost)} / ${money(mission.budget)}`],
        ["Power balance",stats.powerOK,`${stats.powerNeed} / ${stats.powerSupply} W`],
        ["Data downlink",stats.dataOK,`${stats.data} / ${stats.commCapacity} units`]
      ],
      event:eventChoice.event.title, decision:option.label,
      eventDetail: option.detail + (atRisk
        ? " Mission risk remains because engineering readiness or overall performance is below the safe threshold."
        : finalScore >= 65
          ? " Engineering checks are satisfied and the selected response keeps the mission within safe operating limits."
          : " The spacecraft remains within its engineering limits, but the science return or mission score could be improved in a redesign.")
    };
    setReport(finalReport);
    if (socket) socket.emit("mission:report",finalReport);
    setTab("report");
  };

  const reset = () => { setConfig(initialConfig(mission));setReport(null);setEventChoice(null);setLaunched(false);setTab("overview"); };

  return <div className="app-shell">
    <header className="topbar">
      <div className="brand"><div className="brand-mark"><Rocket size={19}/></div><div><b>MISSION CONTROL</b><span>BEYOND EARTH <i>·</i> DESIGN SIMULATOR</span></div></div>
      <div className="top-status"><span className="status-pill"><span className="live-dot"/> SYSTEM ONLINE</span><span className="top-divider"/><span className="mode-label">{mode==="team" ? <><Users size={14}/> TEAM MISSION</> : <><Satellite size={14}/> SOLO FLIGHT</>}</span></div>
    </header>

    {screen==="welcome" ? <main className="welcome">
      <div className="hero-copy">
        <div className="eyebrow"><Sparkles size={14}/> SPACE ENGINEERING SIMULATOR</div>
        <h1>DESIGN YOUR<br/><em>MISSION.</em><br/>CHANGE THE<br/>UNIVERSE.</h1>
        <p>Every decision has a consequence. Build a spacecraft, balance your resources and take your mission beyond Earth.</p>
        <div className="hero-actions"><button className="primary-btn" onClick={()=>setScreen("select")}>START MISSION <ArrowRight size={17}/></button><div className="hero-note"><span className="live-dot"/> 4 SCENARIOS AVAILABLE</div></div>
        <div className="hero-stats"><div><strong>04</strong><span>MISSION TYPES</span></div><div><strong>06</strong><span>SCIENCE PAYLOADS</span></div><div><strong>04</strong><span>TEAM SLOTS</span></div></div>
      </div>
      <div className="hero-visual"><SpaceScene/><div className="floating-card orbit-card"><span>ORBITAL STATUS</span><b>STABLE</b><small>LEO · 550 KM</small></div><div className="floating-card signal-card"><span>DOWNLINK</span><b>98.4%</b><small>GROUND LINK ACTIVE</small></div><div className="hero-coordinate">28° 33' 0.00" N<br/>80° 34' 0.00" W</div></div>
    </main> : screen==="select" ? <main className="selection-page">
      <div className="page-heading"><div><div className="eyebrow">PHASE 01 / MISSION BRIEFING</div><h2>Choose your <em>destination.</em></h2><p>Select a mission profile. Your objective determines the engineering challenges ahead.</p></div><div className="phase-number">01 <span>/ 06</span></div></div>
      <div className="mission-grid">{missions.map((m,i)=><button key={m.id} className={`mission-card ${missionId===m.id?"selected":""} ${m.color}`} onClick={()=>chooseMission(m.id)}><div className="mission-card-top"><span>{String(i+1).padStart(2,"0")} / {m.type}</span><Target size={19}/></div><div className="mission-planet"><div className={`planet planet-${m.id}`}/></div><h3>{m.name}</h3><p>{m.desc}</p><div className="mission-card-foot"><span><Activity size={13}/> {m.difficulty}</span><span>SCIENCE {m.science}%</span></div></button>)}</div>
      <div className="setup-row"><div className="difficulty-note"><ShieldCheck size={17}/><span><b>Adaptive challenge</b><small>Engineering complexity scales with your selected mission.</small></span></div><div className="setup-actions"><button className="text-btn" onClick={()=>setScreen("welcome")}>BACK</button><button className="primary-btn" onClick={()=>setScreen("mode")}>CONTINUE <ArrowRight size={16}/></button></div></div>
    </main> : screen==="mode" ? <main className="selection-page mode-page">
      <div className="page-heading"><div><div className="eyebrow">PHASE 02 / CREW CONFIGURATION</div><h2>Who's on <em>your crew?</em></h2><p>Fly solo or invite up to three other mission engineers.</p></div><div className="phase-number">02 <span>/ 06</span></div></div>
      <div className="mode-grid">
        <button className={`mode-card ${mode==="solo"?"selected":""}`} onClick={()=>setMode("solo")}><div className="mode-icon"><Satellite size={28}/></div><h3>SOLO FLIGHT</h3><p>Take command of every engineering decision. Ideal for learning the full mission design process.</p><div className="mode-meta">1 PARTICIPANT <Check size={15}/></div></button>
        <button className={`mode-card ${mode==="team"?"selected":""}`} onClick={()=>setMode("team")}><div className="mode-icon"><Users size={28}/></div><h3>TEAM MISSION</h3><p>Collaborate in a shared mission room. Assign roles and build a spacecraft together.</p><div className="mode-meta">UP TO 4 PARTICIPANTS <Check size={15}/></div></button>
      </div>
      {mode==="team" && <div className="team-join"><div className="field"><label>CALLSIGN</label><input value={name} onChange={e=>setName(e.target.value)} placeholder="Your name"/></div><div className="field"><label>MISSION ROOM CODE</label><input value={roomCode} onChange={e=>setRoomCode(e.target.value.toUpperCase())} maxLength={8}/></div><div className="field"><label>YOUR ROLE</label><select value={role} onChange={e=>setRole(e.target.value)}>{roles.map(r=><option key={r}>{r}</option>)}</select></div><p className="hint">Share this room code with your team. All participants must connect to the same server.</p></div>}
      <div className="setup-row"><div className="difficulty-note"><Users size={17}/><span><b>Shared command deck</b><small>Team members see the same mission configuration and simulation report.</small></span></div><div className="setup-actions"><button className="text-btn" onClick={()=>setScreen("select")}>BACK</button>{mode==="team"?<button className="primary-btn" onClick={joinRoom}>JOIN MISSION <ArrowRight size={16}/></button>:<button className="primary-btn" onClick={()=>setScreen("mission")}>ENTER MISSION CONTROL <ArrowRight size={16}/></button>}</div></div>
    </main> : <main className="mission-page">
      <div className="mission-header"><div><div className="eyebrow">MISSION {mission.id.toUpperCase()} / ACTIVE DESIGN</div><h2>{mission.name} <span className="mission-state">DESIGN PHASE</span></h2><p>{mission.objective}</p></div><div className="mission-header-actions">{mode==="team"&&<div className="crew-chip"><Users size={15}/>{players.length || 1}/4 CREW</div>}<button className="outline-btn" onClick={reset}><RotateCcw size={14}/> RESET DESIGN</button></div></div>
      <div className="workspace">
        <section className="workspace-main">
          <div className="scene-panel"><SpaceScene launched={launched} orbit={config.orbit} config={config}/><div className="scene-overlay"><div><span>SPACECRAFT TRACKING</span><b>{launched?"MISSION ACTIVE":"PRE-LAUNCH CONFIGURATION"}</b></div><div className="scene-coords"><span>ALTITUDE / TRAJECTORY</span><b>{stats.orbit.altitude}</b></div></div></div>
          <div className="tabbar">{[["overview","Overview"],["spacecraft","Spacecraft"],["payload","Science payload"],["orbit","Orbit & launch"],["simulation","Simulation"],["report","Mission report"]].map(([id,label])=><button key={id} className={tab===id?"active":""} onClick={()=>setTab(id)}>{label}</button>)}</div>
          {tab==="overview"&&<div className="tab-content"><div className="section-title"><div><span className="eyebrow">MISSION DESIGN / 01</span><h3>Engineering overview</h3></div><span className="muted-tag">LIVE CONFIGURATION</span></div><div className="overview-grid"><div className="overview-objective"><Target size={20}/><span>PRIMARY OBJECTIVE</span><b>{mission.objective}</b><small>Target mission lifetime: {mission.duration} years</small></div><div className="overview-info"><div><span>MISSION TYPE</span><b>{mission.type}</b></div><div><span>SCIENCE TARGET</span><b>{mission.science} POINTS</b></div><div><span>AVAILABLE BUDGET</span><b>{money(mission.budget)}</b></div><div><span>SELECTED ORBIT</span><b>{stats.orbit.name}</b></div></div></div><div className="tip-box"><Sparkles size={17}/><div><b>ENGINEERING TIP</b><p>{stats.powerOK?"Power balance is currently healthy.":"Your spacecraft needs more power generation or fewer power-hungry systems."} {stats.dataOK?"Your communications system can handle the current data volume.":"Consider a higher-capacity antenna or fewer instruments."}</p></div></div></div>}
          {tab==="spacecraft"&&<div className="tab-content"><div className="section-title"><div><span className="eyebrow">SYSTEMS ENGINEERING / 02</span><h3>Build your spacecraft</h3></div><span className="muted-tag">5 SUBSYSTEMS</span></div><div className="component-grid">{Object.entries(components).map(([key,list])=><div className="component-group" key={key}><div className="component-heading"><span>{key.toUpperCase()}</span><small>{key==="power"?"POWER GENERATION":key==="comms"?"DATA LINK":key==="bus"?"STRUCTURE":key==="computer"?"AVIONICS":"MANEUVERING"}</small></div>{list.map(c=><button key={c.id} className={`component-option ${config[key]===c.id?"chosen":""}`} onClick={()=>update(key,c.id)}><span className="option-radio">{config[key]===c.id&&<span/>}</span><span className="option-copy"><b>{c.name}</b><small>{c.desc}</small></span><span className="option-values"><b>{c.mass} kg</b><small>{money(c.cost)}</small></span></button>)}</div>)}</div></div>}
          {tab==="payload"&&<div className="tab-content"><div className="section-title"><div><span className="eyebrow">SCIENCE OPERATIONS / 03</span><h3>Select instruments</h3><p>More instruments increase scientific value but consume mass, power, budget and bandwidth.</p></div><span className="muted-tag">{config.instruments.length} SELECTED</span></div><div className="instrument-grid">{instruments.map(i=><button key={i.id} className={`instrument-card ${config.instruments.includes(i.id)?"chosen":""}`} onClick={()=>toggleInstrument(i.id)}><div className="instrument-top"><span>{i.category}</span><span className="check-box">{config.instruments.includes(i.id)&&<Check size={13}/>}</span></div><Atom size={22}/><b>{i.name}</b><p>{i.desc}</p><div className="instrument-stats"><span>{i.mass} kg</span><span>{i.power} W</span><span>{money(i.cost)}</span><span>+{i.science} SCI</span></div></button>)}</div></div>}
          {tab==="orbit"&&<div className="tab-content"><div className="section-title"><div><span className="eyebrow">MISSION ARCHITECTURE / 04</span><h3>Orbit & launch vehicle</h3><p>Not every launcher can reach every orbit. Check both destination and payload capacity.</p></div></div><div className="orbit-list">{orbits.map(o=><button key={o.id} className={`orbit-option ${config.orbit===o.id?"chosen":""}`} onClick={()=>update("orbit",o.id)}><div className="orbit-icon"><Globe2 size={20}/></div><div className="orbit-copy"><b>{o.name}</b><small>{o.altitude} · {o.desc}</small></div><div className="orbit-coverage"><span>COVERAGE</span><b>{o.coverage}%</b></div><span className="option-radio">{config.orbit===o.id&&<span/>}</span></button>)}</div><div className="launcher-select"><label>SELECT LAUNCH VEHICLE</label><div className="launcher-grid">{launchers.map(l=><button key={l.id} className={`launcher-card ${config.launcher===l.id?"chosen":""}`} onClick={()=>update("launcher",l.id)}><Rocket size={20}/><b>{l.name}</b><small>{l.capacity} kg payload capacity</small><strong>{money(l.cost)}</strong></button>)}</div></div></div>}
          {tab==="simulation"&&<div className="tab-content"><div className="section-title"><div><span className="eyebrow">FLIGHT OPERATIONS / 05</span><h3>Mission simulation</h3><p>Run a mission to test your engineering decisions against operational constraints.</p></div></div>{!eventChoice?<div className="preflight"><div className="preflight-icon"><Rocket size={34}/></div><h3>Ready for launch?</h3><p>Run the pre-flight checks, launch your spacecraft and resolve an unexpected mission event.</p><button className="primary-btn" onClick={runSimulation}><Play size={16}/> RUN SIMULATION</button></div>:<div className="event-card"><div className="event-alert"><AlertTriangle size={18}/> FLIGHT EVENT DETECTED</div><h3>{eventChoice.event.title}</h3><p>{eventChoice.event.text}</p><b className="decision-label">CHOOSE YOUR RESPONSE</b><div className="event-options">{eventChoice.event.options.map(o=><button key={o.label} onClick={()=>resolveEvent(o)}><span><b>{o.label}</b><small>{o.detail}</small></span><ChevronRight size={17}/></button>)}</div></div>}</div>}
          {tab==="report"&&<div className="tab-content">{!report?<div className="preflight"><div className="preflight-icon"><Gauge size={32}/></div><h3>No mission report yet</h3><p>Complete a simulation to generate your engineering performance report.</p><button className="primary-btn" onClick={()=>setTab("simulation")}>GO TO SIMULATION <ArrowRight size={16}/></button></div>:<div className="report-panel"><div className={`report-banner ${report.success?"success":"failure"}`}><div><span>MISSION PERFORMANCE</span><h3>{report.title}</h3><small>{report.event} · Decision: {report.decision}</small></div><div className="score-circle"><b>{report.score}</b><span>/ 100</span></div></div><div className="report-metrics"><Metric icon={Atom} label="SCIENCE RETURN" value={`${report.science}%`} sub="Mission science potential"/><Metric icon={ShieldCheck} label="RELIABILITY" value={`${report.reliability}%`} sub="System reliability estimate"/><Metric icon={CircleDollarSign} label="TOTAL COST" value={money(report.cost)} sub="Including launch and orbit"/><Metric icon={Gauge} label="PAYLOAD MASS" value={`${report.mass} kg`} sub="Total spacecraft mass"/></div><h4 className="checks-title">ENGINEERING CONSTRAINTS</h4><div className="check-list">{report.checks.map(([label,ok,detail])=>{const passed = ok === true; const statusColor = passed ? "#22c55e" : "#ef4444"; return <div key={label} data-check-status={passed ? "pass" : "fail"}><span className={passed?"check-good":"check-bad"} style={{color:statusColor,backgroundColor:passed?"rgba(34,197,94,0.12)":"rgba(239,68,68,0.14)",border:`1px solid ${statusColor}`,boxShadow:`0 0 0 1px ${statusColor} inset`}}>{passed?<Check size={14} color={statusColor} stroke={statusColor}/>:<X size={14} color={statusColor} stroke={statusColor}/>}</span><b>{label}</b><small>{detail}</small><strong style={{color:statusColor}}>{passed?"PASS":"FAIL"}</strong></div>})}</div><div className="event-summary"><b>FLIGHT DIRECTOR'S NOTE</b><p>{report.eventDetail}</p></div><button className="primary-btn" onClick={reset}><RotateCcw size={15}/> REDESIGN & RETRY</button></div>}</div>}
        </section>
        <aside className="right-rail">
          <div className="rail-heading"><span>MISSION TELEMETRY</span><Activity size={16}/></div>
          <div className="mission-score"><div><span>SCIENCE POTENTIAL</span><b>{Math.round(stats.science)}<small>/100</small></b></div><div className="score-ring"><span>{Math.round(stats.science)}%</span></div></div>
          <div className="resource-list">
            <Metric icon={CircleDollarSign} label="BUDGET" value={money(stats.cost)} sub={`of ${money(mission.budget)} available`} status={stats.budgetOK?"good":"bad"}/>
            <Metric icon={Gauge} label="SPACECRAFT MASS" value={`${stats.mass} kg`} sub={`Launcher limit ${stats.launcher.capacity} kg`} status={stats.massOK?"good":"bad"}/>
            <Metric icon={Zap} label="POWER BALANCE" value={`${stats.powerNeed} / ${stats.powerSupply} W`} sub={stats.powerOK?"Power margin positive":"Power deficit"} status={stats.powerOK?"good":"bad"}/>
            <Metric icon={Radio} label="DATA DOWNLINK" value={`${stats.data} / ${stats.commCapacity}`} sub={stats.dataOK?"Bandwidth sufficient":"Downlink overloaded"} status={stats.dataOK?"good":"bad"}/>
          </div>
          <div className="constraint-card"><div className="constraint-title">PRE-FLIGHT CHECKS <span>{[stats.massOK,stats.orbitOK,stats.budgetOK,stats.powerOK,stats.dataOK].filter(v=>v===true).length}/5</span></div>{[["Mass capacity",stats.massOK],["Orbit compatibility",stats.orbitOK],["Budget limit",stats.budgetOK],["Power generation",stats.powerOK],["Data capacity",stats.dataOK]].map(([l,ok])=>{const passed = ok === true; const statusColor = passed ? "#22c55e" : "#ef4444"; return <div className="constraint-row" key={l} data-check-status={passed?"pass":"fail"}><span className={passed?"mini-check":"mini-fail"} style={{color:statusColor,backgroundColor:passed?"rgba(34,197,94,0.12)":"rgba(239,68,68,0.14)",border:`1px solid ${statusColor}`}}>{passed?"✓":"✕"}</span>{l}<b style={{color:statusColor}}>{passed?"PASS":"FAIL"}</b></div>})}</div>
          {mode==="team"&&<div className="crew-panel"><div className="constraint-title">MISSION CREW <span>{players.length}/4</span></div>{players.map(p=><div className="crew-person" key={p.id}><div className="avatar">{p.name.slice(0,1).toUpperCase()}</div><span><b>{p.name}{p.id===selfId?" (YOU)":""}</b><small>{p.role}</small></span><span className="online-dot"/></div>)}{players.length===0&&<small className="muted">Waiting for crew connection…</small>}</div>}
          <button className="launch-btn" onClick={()=>{setTab("simulation");if(!eventChoice)runSimulation();}}><Rocket size={17}/> {launched?"VIEW FLIGHT SIMULATION":"INITIATE MISSION"} <ArrowRight size={15}/></button>
          <div className="rail-foot"><span className="live-dot"/> TELEMETRY UPDATING LIVE</div>
        </aside>
      </div>
    </main>}
    {notice&&<div className="toast"><AlertTriangle size={16}/>{notice}<button onClick={()=>setNotice("")}><X size={14}/></button></div>}
    <footer className="footer"><span>© 2026 MISSION CONTROL / EDUCATIONAL SIMULATOR</span><span>SIMULATION VALUES ARE ILLUSTRATIVE · NOT FLIGHT-CERTIFIED DATA</span></footer>
  </div>;
}

export default App;
