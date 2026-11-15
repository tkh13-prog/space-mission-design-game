import React, { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * Destination-aware live 3D mission scene.
 * config.mission selects the celestial body; config.orbit selects its orbit.
 * Changing spacecraft subsystems updates the visible hardware in-place.
 */
export default function SpaceScene({ launched = false, orbit = "LEO", config = {} }) {
  const mountRef = useRef(null);
  const launchRef = useRef(launched);
  const orbitRef = useRef(orbit);
  const configRef = useRef(config);

  useEffect(() => { launchRef.current = launched; }, [launched]);
  useEffect(() => { orbitRef.current = orbit; }, [orbit]);
  useEffect(() => { configRef.current = config || {}; }, [config]);

  useEffect(() => {
    const host = mountRef.current;
    if (!host) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x030914);

    const camera = new THREE.PerspectiveCamera(39, 1, 0.1, 100);
    camera.position.set(0, 0.25, 9.2);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.domElement.style.cssText = "display:block;width:100%;height:100%;";
    host.appendChild(renderer.domElement);

    // Star field
    const starPositions = [];
    for (let i = 0; i < 1900; i++) {
      starPositions.push((Math.random() - 0.5) * 42, (Math.random() - 0.5) * 25, (Math.random() - 0.5) * 30);
    }
    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute("position", new THREE.Float32BufferAttribute(starPositions, 3));
    const stars = new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: 0xb9dfff, size: 0.027, transparent: true, opacity: 0.9 }));
    scene.add(stars);

    // Procedural texture generator for the mission destination.
    const makeTexture = (kind) => {
      const canvas = document.createElement("canvas");
      canvas.width = 1024;
      canvas.height = 512;
      const ctx = canvas.getContext("2d");
      const palettes = {
        earth: ["#062b50", "#0879ad", "#031a39"],
        moon: ["#343b46", "#92969b", "#4b5058"],
        mars: ["#57251d", "#c65c36", "#702d22"]
      };
      const colors = palettes[kind] || palettes.earth;
      const gradient = ctx.createLinearGradient(0, 0, 1024, 512);
      gradient.addColorStop(0, colors[0]);
      gradient.addColorStop(0.5, colors[1]);
      gradient.addColorStop(1, colors[2]);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 1024, 512);

      if (kind === "earth") {
        const continents = [
          [[95,100],[145,65],[205,85],[245,135],[220,185],[240,235],[195,300],[155,275],[125,210],[90,160]],
          [[220,290],[275,300],[300,365],[270,440],[235,470],[205,390]],
          [[440,90],[500,65],[565,90],[600,135],[565,180],[535,235],[480,205],[450,155]],
          [[500,230],[550,225],[580,290],[550,385],[510,435],[475,350]],
          [[680,105],[745,80],[810,110],[855,160],[820,205],[755,200],[700,160]],
          [[750,260],[800,240],[845,280],[825,350],[780,395],[745,330]]
        ];
        continents.forEach(points => {
          ctx.beginPath();
          points.forEach((p, i) => i ? ctx.lineTo(...p) : ctx.moveTo(...p));
          ctx.closePath();
          ctx.fillStyle = "#438d68";
          ctx.fill();
          ctx.strokeStyle = "#78bd87";
          ctx.lineWidth = 3;
          ctx.stroke();
        });
        for (let i = 0; i < 350; i++) {
          ctx.fillStyle = "rgba(205,235,255,0.10)";
          ctx.fillRect(Math.random() * 1024, Math.random() * 512, Math.random() * 18 + 2, 2);
        }
      } else {
        // Craters / surface markings for Moon and Mars.
        for (let i = 0; i < (kind === "moon" ? 180 : 95); i++) {
          const x = Math.random() * 1024;
          const y = Math.random() * 512;
          const r = kind === "moon" ? 5 + Math.random() * 25 : 3 + Math.random() * 17;
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fillStyle = kind === "moon" ? "rgba(25,30,38,0.22)" : "rgba(75,22,15,0.20)";
          ctx.fill();
          ctx.strokeStyle = kind === "moon" ? "rgba(220,225,230,0.24)" : "rgba(255,180,120,0.18)";
          ctx.lineWidth = 2;
          ctx.stroke();
        }
        if (kind === "mars") {
          ctx.strokeStyle = "rgba(70,25,18,0.22)";
          ctx.lineWidth = 12;
          for (let i = 0; i < 14; i++) {
            ctx.beginPath();
            const y = Math.random() * 512;
            ctx.moveTo(0, y);
            ctx.bezierCurveTo(300, y - 35, 650, y + 45, 1024, y - 15);
            ctx.stroke();
          }
        }
      }
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    };

    const textures = {
      earth: makeTexture("earth"),
      moon: makeTexture("moon"),
      mars: makeTexture("mars")
    };

    const destinationGroup = new THREE.Group();
    destinationGroup.position.set(-1.35, -0.72, -1.45);
    scene.add(destinationGroup);

    const bodyDefinitions = [
      { id: "earth", radius: 1.72, texture: textures.earth, specular: 0x579dce, emissive: 0x06172a },
      { id: "moon", radius: 1.48, texture: textures.moon, specular: 0x777d85, emissive: 0x101216 },
      { id: "mars", radius: 1.62, texture: textures.mars, specular: 0xb75c3b, emissive: 0x29100b }
    ];
    const bodies = {};
    bodyDefinitions.forEach(def => {
      const group = new THREE.Group();
      const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(def.radius, 80, 80),
        new THREE.MeshPhongMaterial({ map: def.texture, shininess: def.id === "earth" ? 38 : 12, specular: def.specular, emissive: def.emissive, emissiveIntensity: 0.22 })
      );
      group.add(sphere);
      const cloudOrGlow = new THREE.Mesh(
        new THREE.SphereGeometry(def.radius * (def.id === "earth" ? 1.015 : 1.035), 48, 48),
        new THREE.MeshBasicMaterial({
          color: def.id === "earth" ? 0xbceaff : def.id === "mars" ? 0xe97848 : 0xcbd0d6,
          wireframe: def.id === "earth",
          transparent: true,
          opacity: def.id === "earth" ? 0.075 : 0.10,
          side: THREE.BackSide
        })
      );
      group.add(cloudOrGlow);
      destinationGroup.add(group);
      bodies[def.id] = { group, sphere, atmosphere: cloudOrGlow };
    });

    // Storm Watch weather visualization: a visible rotating storm system over Earth.
    // It is shown only for the climate mission; the destination remains Earth because
    // Storm Watch observes terrestrial weather, not another planet.
    const stormSystem = new THREE.Group();
    const stormCloudMaterial = new THREE.MeshBasicMaterial({ color: 0xe7f5ff, transparent: true, opacity: 0.72, depthWrite: false });
    const stormBlueMaterial = new THREE.MeshBasicMaterial({ color: 0x65c8f2, transparent: true, opacity: 0.78, depthWrite: false });
    const stormCenter = new THREE.Mesh(new THREE.SphereGeometry(0.105, 20, 16), new THREE.MeshBasicMaterial({ color: 0xf4fbff, transparent: true, opacity: 0.9 }));
    stormCenter.position.set(0.48, 0.34, 1.65);
    stormSystem.add(stormCenter);
    const stormRing1 = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.045, 8, 64), stormCloudMaterial);
    stormRing1.position.copy(stormCenter.position);
    stormRing1.rotation.set(0.42, 0.15, 0.25);
    stormSystem.add(stormRing1);
    const stormRing2 = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.025, 8, 64), stormBlueMaterial);
    stormRing2.position.copy(stormCenter.position);
    stormRing2.rotation.set(0.55, -0.25, -0.2);
    stormSystem.add(stormRing2);
    for (let i = 0; i < 7; i++) {
      const angle = (i / 7) * Math.PI * 2;
      const puff = new THREE.Mesh(new THREE.SphereGeometry(0.075 + (i % 3) * 0.018, 14, 10), stormCloudMaterial);
      puff.scale.set(1.45, 0.72, 0.55);
      puff.position.set(0.48 + Math.cos(angle) * 0.27, 0.34 + Math.sin(angle) * 0.18, 1.66);
      stormSystem.add(puff);
    }
    bodies.earth.group.add(stormSystem);
    stormSystem.visible = false;

    // Orbital tracks centred on the selected destination.
    const orbitGroup = new THREE.Group();
    orbitGroup.position.copy(destinationGroup.position);
    orbitGroup.rotation.set(Math.PI / 2.45, 0.12, 0.18);
    scene.add(orbitGroup);
    const orbitTrack = new THREE.Mesh(new THREE.TorusGeometry(2.62, 0.012, 8, 220), new THREE.MeshBasicMaterial({ color: 0x39caff, transparent: true, opacity: 0.8 }));
    orbitGroup.add(orbitTrack);
    const orbitTrack2 = new THREE.Mesh(new THREE.TorusGeometry(2.82, 0.006, 6, 200), new THREE.MeshBasicMaterial({ color: 0x237db7, transparent: true, opacity: 0.35 }));
    orbitTrack2.rotation.set(0.45, 0.35, 0.1);
    orbitGroup.add(orbitTrack2);

    // Satellite assembly.
    const satellite = new THREE.Group();
    scene.add(satellite);
    const metal = new THREE.MeshStandardMaterial({ color: 0xdce8f5, metalness: 0.78, roughness: 0.25 });
    const darkMetal = new THREE.MeshStandardMaterial({ color: 0x526b83, metalness: 0.8, roughness: 0.3 });
    const gold = new THREE.MeshStandardMaterial({ color: 0xe7ad54, metalness: 0.65, roughness: 0.28 });
    const bluePanel = new THREE.MeshStandardMaterial({ color: 0x07549b, metalness: 0.55, roughness: 0.28, side: THREE.DoubleSide, emissive: 0x031c38 });
    const panelGroup = new THREE.Group(); satellite.add(panelGroup);
    const antennaGroup = new THREE.Group(); satellite.add(antennaGroup);
    const busGroup = new THREE.Group(); satellite.add(busGroup);
    const propulsionGroup = new THREE.Group(); satellite.add(propulsionGroup);
    const payloadGroup = new THREE.Group(); satellite.add(payloadGroup);

    const busBody = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.56, 0.46), metal); busGroup.add(busBody);
    const busTop = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.13, 0.32), gold); busTop.position.y = 0.34; busGroup.add(busTop);
    const busBand = new THREE.Mesh(new THREE.BoxGeometry(0.505, 0.09, 0.485), darkMetal); busBand.position.y = -0.12; busGroup.add(busBand);

    const solarWings = [];
    for (const side of [-1, 1]) {
      const wing = new THREE.Group();
      const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.52, 8), gold); boom.rotation.z = Math.PI / 2; boom.position.x = side * 0.53; wing.add(boom);
      const panel = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.055, 0.66), bluePanel); panel.position.x = side * 1.12; wing.add(panel);
      const grid = new THREE.GridHelper(0.92, 8, 0x8bdcff, 0x397db7); grid.scale.set(1, 0.02, 0.7); grid.position.set(side * 1.12, 0.032, 0); wing.add(grid);
      panelGroup.add(wing); solarWings.push(wing);
    }
    const rtg = new THREE.Group();
    const rtgCore = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.19, 0.52, 16), darkMetal); rtg.add(rtgCore);
    const rtgCap = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.20, 0.08, 16), gold); rtgCap.position.y = 0.29; rtg.add(rtgCap);
    for (let i = 0; i < 8; i++) { const fin = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.52, 0.22), metal); fin.rotation.y = i * Math.PI / 4; rtg.add(fin); }
    rtg.position.set(0.68, -0.12, 0); panelGroup.add(rtg);

    const antennaStem = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.42, 10), metal); antennaStem.position.set(0.02, 0.55, 0); antennaGroup.add(antennaStem);
    const antennaDish = new THREE.Mesh(new THREE.SphereGeometry(0.25, 28, 18, 0, Math.PI * 2, 0, Math.PI / 2), gold); antennaDish.rotation.x = Math.PI; antennaDish.position.set(0.02, 0.79, 0); antennaGroup.add(antennaDish);
    const antennaFeed = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.23, 8), darkMetal); antennaFeed.position.set(0.02, 0.66, 0.12); antennaGroup.add(antennaFeed);
    const lowAntenna = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.75, 8), gold); lowAntenna.position.set(0.02, 0.65, 0); antennaGroup.add(lowAntenna);

    const engineBell = new THREE.Mesh(new THREE.ConeGeometry(0.19, 0.36, 16, 1, true), gold); engineBell.rotation.x = Math.PI; engineBell.position.y = -0.47; propulsionGroup.add(engineBell);
    const engineGlow = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.55, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0x35bfff, transparent: true, opacity: 0 })); engineGlow.rotation.x = Math.PI; engineGlow.position.y = -0.88; propulsionGroup.add(engineGlow);
    for (const side of [-1, 1]) { const thruster = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.25, 10), darkMetal); thruster.rotation.z = side * 0.45; thruster.position.set(side * 0.34, -0.22, 0); propulsionGroup.add(thruster); }

    const instrumentModels = {};
    const addInstrument = (id, geometry, material, position, rotation = [0, 0, 0]) => {
      const group = new THREE.Group();
      const mesh = new THREE.Mesh(geometry, material); mesh.position.set(...position); mesh.rotation.set(...rotation); group.add(mesh);
      payloadGroup.add(group); instrumentModels[id] = group;
    };
    addInstrument("camera", new THREE.CylinderGeometry(0.13, 0.16, 0.22, 16), darkMetal, [-0.29, 0.18, 0.25], [Math.PI / 2, 0, 0]);
    addInstrument("radar", new THREE.BoxGeometry(0.22, 0.38, 0.24), gold, [0.29, 0.12, 0.25]);
    addInstrument("spectrometer", new THREE.BoxGeometry(0.20, 0.25, 0.20), new THREE.MeshStandardMaterial({ color: 0x4b8fbd, metalness: 0.6, roughness: 0.3 }), [-0.28, -0.18, 0.25]);
    addInstrument("magnetometer", new THREE.CylinderGeometry(0.035, 0.035, 0.75, 8), gold, [0.48, 0.05, 0]);
    addInstrument("thermal", new THREE.BoxGeometry(0.25, 0.16, 0.22), new THREE.MeshStandardMaterial({ color: 0xc66b43, metalness: 0.4, roughness: 0.35 }), [0.28, -0.18, 0.25]);
    addInstrument("particle", new THREE.SphereGeometry(0.13, 16, 12), new THREE.MeshStandardMaterial({ color: 0x65c6e8, metalness: 0.5, roughness: 0.25 }), [0, -0.02, -0.30]);

    const led = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 10), new THREE.MeshBasicMaterial({ color: 0x45e5ad }));
    led.position.set(0.25, 0.22, 0.25); busGroup.add(led);

    const sun = new THREE.DirectionalLight(0xffffff, 3.0); sun.position.set(5, 6, 8); scene.add(sun);
    const blueFill = new THREE.PointLight(0x218dff, 13, 18); blueFill.position.set(-5, 2, 3); scene.add(blueFill);
    scene.add(new THREE.AmbientLight(0x8daacb, 1.25));

    let lastSignature = "";
    const syncModel = () => {
      const c = configRef.current || {};
      const signature = JSON.stringify({ mission: c.mission, bus: c.bus, power: c.power, comms: c.comms, propulsion: c.propulsion, instruments: c.instruments || [] });
      if (signature === lastSignature) return;
      lastSignature = signature;

      const destination = c.mission === "moon" ? "moon" : c.mission === "mars" ? "mars" : "earth";
      Object.entries(bodies).forEach(([id, body]) => { body.group.visible = id === destination; });
      stormSystem.visible = c.mission === "climate";
      const radius = destination === "moon" ? 1.48 : destination === "mars" ? 1.62 : 1.72;
      orbitTrack.geometry.dispose();
      orbitTrack.geometry = new THREE.TorusGeometry(radius + 0.88, 0.012, 8, 220);
      orbitTrack2.geometry.dispose();
      orbitTrack2.geometry = new THREE.TorusGeometry(radius + 1.08, 0.006, 6, 200);

      busGroup.scale.setScalar(c.bus === "nano" ? 0.78 : c.bus === "heavy" ? 1.22 : 1);
      busGroup.position.y = c.bus === "heavy" ? 0.02 : 0;

      const isRTG = c.power === "rtg";
      rtg.visible = isRTG;
      solarWings.forEach(wing => {
        wing.visible = !isRTG;
        const deployable = c.power === "deployable";
        wing.scale.set(deployable ? 1.12 : 0.72, 1, deployable ? 1.08 : 0.78);
      });
      if (isRTG) rtg.scale.setScalar(c.bus === "heavy" ? 1.18 : 0.92);

      antennaDish.visible = c.comms !== "low";
      antennaStem.visible = c.comms !== "low";
      antennaFeed.visible = c.comms !== "low";
      lowAntenna.visible = c.comms === "low";
      antennaDish.scale.setScalar(c.comms === "high" ? 1.55 : 0.85);
      antennaDish.position.y = c.comms === "high" ? 0.88 : 0.79;

      propulsionGroup.scale.setScalar(c.propulsion === "electric" ? 0.85 : c.propulsion === "coldgas" ? 0.72 : 1);
      const selected = new Set(c.instruments || []);
      Object.entries(instrumentModels).forEach(([id, model]) => { model.visible = selected.has(id); });
    };

    let frame = 0;
    let animationId = 0;
    let disposed = false;
    const animate = () => {
      if (disposed) return;
      animationId = requestAnimationFrame(animate);
      syncModel();
      frame += launchRef.current ? 0.014 : 0.006;
      const c = configRef.current || {};
      const destination = c.mission === "moon" ? "moon" : c.mission === "mars" ? "mars" : "earth";
      Object.values(bodies).forEach(body => { if (body.group.visible) body.sphere.rotation.y += destination === "moon" ? 0.00055 : 0.0015; });
      if (bodies.earth.group.visible) bodies.earth.atmosphere.rotation.y += 0.0019;
      if (stormSystem.visible) { stormSystem.rotation.y += 0.0022; stormSystem.rotation.z = Math.sin(frame * 0.18) * 0.035; }
      stars.rotation.y += 0.00006;
      orbitGroup.rotation.z += 0.00028;

      const orbitId = orbitRef.current;
      const orbitRadius = orbitId === "GEO" ? 3.25 : orbitId === "Polar" ? 2.78 : orbitId === "MEO" ? 3.0 : orbitId === "Lunar" ? 2.65 : orbitId === "Mars" ? 2.85 : 2.58;
      const angle = frame * (launchRef.current ? 1.55 : 0.92);
      satellite.position.set(
        destinationGroup.position.x + Math.cos(angle) * orbitRadius,
        destinationGroup.position.y + Math.sin(angle) * orbitRadius * 0.48,
        0.28 + Math.sin(angle) * 0.65
      );
      satellite.rotation.set(0.15 + Math.sin(angle) * 0.12, frame * 0.28, -0.2 + Math.cos(angle) * 0.12);
      engineGlow.material.opacity = launchRef.current ? 0.7 : 0;
      engineGlow.scale.setScalar(launchRef.current ? 1 : 0.001);
      renderer.render(scene, camera);
    };

    const resize = () => {
      if (disposed) return;
      const w = Math.max(host.clientWidth, 1), h = Math.max(host.clientHeight, 1);
      camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h);
    };
    const observer = new ResizeObserver(resize); observer.observe(host);
    window.addEventListener("resize", resize);
    resize(); syncModel(); animate();

    return () => {
      disposed = true; cancelAnimationFrame(animationId); observer.disconnect();
      window.removeEventListener("resize", resize);
      scene.traverse(object => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) (Array.isArray(object.material) ? object.material : [object.material]).forEach(m => m.dispose());
      });
      Object.values(textures).forEach(texture => texture.dispose());
      renderer.dispose();
      if (renderer.domElement.parentNode === host) host.removeChild(renderer.domElement);
    };
  }, []);

  const destinationLabel = config?.mission === "moon" ? "MOON" : config?.mission === "mars" ? "MARS" : config?.mission === "climate" ? "EARTH · STORM WATCH" : "EARTH";
  return (
    <div className="space-scene" ref={mountRef}>
      <div className="scene-label"><span className="live-dot" /> LIVE SPACECRAFT CONFIGURATION</div>
      <div className="scene-caption">{destinationLabel} · {orbit.toUpperCase()}</div>
    </div>
  );
}
