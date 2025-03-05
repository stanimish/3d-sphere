import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const canvas = document.getElementById('webgl-canvas');
/*
// Try to get the standard WebGL context, if not available, fall back to experimental
const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

if (!gl) {
  console.log('Unable to initialize WebGL. Your browser or machine may not support it.');
} else {
  // Proceed with your WebGL calls
  console.log('WebGL context obtained successfully!');
}*/

// cubeInit();

let renderer;
let scene, camera;
let electron;

gsap.registerPlugin(ScrollTrigger);

init();

function init() {
  // features variables
  const feature1FinalScale = 2;
  const featureFinalScale = 1.4;
  const blurLevel = 6;
  const overlapPercent = 15;
  const hasOrbitControls = false;

  const cameraFromZ = 18;
  const cameraToZ = 5;
  const balls = 20;
  const size = 0.5;

  const electronSize = 1;
  const electronColor = 'rgb(255,255,255)';

  const dotColor = 'rgb(204,204,204)';
  const backgroundColor = '#2A2A2A';

  // canvas = document.getElementById( 'c' );

  renderer = new THREE.WebGLRenderer( { canvas: canvas, antialias: true } );
  renderer.setPixelRatio( window.devicePixelRatio );
  renderer.setSize( window.innerWidth, window.innerHeight );
  // renderer.setAnimationLoop( animate );
  

  scene = new THREE.Scene();
  scene.background = new THREE.Color( 0x1111111 );

  const geometry0 = new THREE.BufferGeometry();
  // const geometry1 = new THREE.BufferGeometry();

  const vertices = [];
  const sizes = [];
  const freqs = [];


  const colors = [];
  const color = new THREE.Color();

  const r = balls/2;
  const valuesArray = [];

  // possible coordinates, needed for weighted random, 
  // keeping in note that the center of sphere is empty
  for ( let p = 2; p <= r; p ++ ) {
    valuesArray.push(p)
  }

  for ( let m = 0; m < Math.pow( balls, 3 ); m ++ ) {

    const getWeightedRandom = weightedRandom(valuesArray, "power4.out")();
    
    const iValue = gsap.utils.random([-1, 1]) * gsap.utils.random(0, r);
    // const jValue = gsap.utils.random([-1, 1]) * gsap.utils.random(0, r);
    const jValue = gsap.utils.random([-1, 1]) * (getWeightedRandom + gsap.utils.random(-0.5, 0));
    const kValue = gsap.utils.random([-1, 1]) * gsap.utils.random(0, Math.sqrt(r * r - iValue * iValue - jValue * jValue));

    const i = iValue;
    const j = jValue;
    const k = kValue;

    vertices.push( i, j, k );

    const channelColor = gsap.utils.random(0.5, 0.8);

    // color.setRGB( channelColor, channelColor, channelColor, THREE.SRGBColorSpace );

    // colors.push( color.r, color.g, color.b );

    sizes.push( size + Math.random() * size );

    // 3) Random frequency (how fast it oscillates)
    freqs.push( 2 + Math.random() * 4 ); // e.g., 2..6

  }

  geometry0.setAttribute( 'position', new THREE.Float32BufferAttribute( vertices, 3 ) );
  // geometry0.setAttribute( 'color', new THREE.Float32BufferAttribute( colors, 3 ) );
  geometry0.setAttribute( 'aSize', new THREE.Float32BufferAttribute(sizes, 1) );
  geometry0.setAttribute( 'aFrequency', new THREE.Float32BufferAttribute(freqs, 1) );

  // geometry1.setAttribute( 'position', new THREE.Float32BufferAttribute( vertices.slice(), 3 ) );

  

  // 2) Create custom shaders
  const vertexShader = `
  uniform float uTime;
  attribute float aSize;
  attribute float aFrequency;
  varying float vPulse;

  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

    // Random, out-of-sync size growth using sin.
    // aSize is the base size; aFrequency affects speed.
    // We multiply by 30 / -mvPosition.z to scale based on distance to camera.
    float pulsation = sin(uTime * aFrequency); // amplitude of -1..1

    vPulse = (pulsation + 1.0) * 0.5; // 0..1

    float sizeAmplitude = 1.0;
    float finalSize = aSize + vPulse * sizeAmplitude; // 
    
    // Convert the point size from model space to screen space
    // Typically multiply by a scale factor to fit your scene
    gl_PointSize = finalSize * (30.0 / -mvPosition.z);

    gl_Position = projectionMatrix * mvPosition;
  }
  `;

  const fragmentShader = `
  varying float vPulse;

  void main() {
    // Simple circular point shape
    // gl_PointCoord is [0..1] within the point sprite
    vec2 coord = gl_PointCoord - vec2(0.5);
    if (length(coord) > 0.5) {
      discard;
    }

    float colorAmplitude = 0.3;
    float finalColor = 1.0 - (vPulse * colorAmplitude);
    gl_FragColor = vec4(vec3(finalColor), 1); // green color for each particle
  }
  `;

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0.0 }
    },
    vertexShader,
    fragmentShader,
    transparent: true
  })

  scene.add( new THREE.Points( geometry0, material ) );

  camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 100 );
  camera.position.set( 0, 0, cameraFromZ ); // 1.2 * 20

  if (hasOrbitControls) {
    const controls = new OrbitControls( camera, renderer.domElement );
  }

  // remember these initial values
  const tanFOV = Math.tan( ( ( Math.PI / 180 ) * camera.fov / 2 ) );
  const windowHeight = window.innerHeight;

  // Event Listeners
  // -----------------------------------------------------------------------------
  window.addEventListener( 'resize', onWindowResize, false );


  // ST to camera
  const cameraMove = gsap.to(camera.position, {
    z: cameraToZ,
    scrollTrigger: {
      trigger: ".webgl-sphere",
      start: "top top",
      end: "bottom bottom",
      scrub: true,
      id: "sphere",
      // markers: 1
    }
  })

  // creating electrons
  const electrons = [];

  for (let i = 0; i < 25; i++) {
    const electron = createOrbitingParticle();

    // Add the sphere and line to the scene
    scene.add(electron.trailLine);
    scene.add(electron.largeGlow);
    scene.add(electron.smallGlow);
    scene.add(electron.sphere);

    electrons.push(electron);
  }

  const clock  = new THREE.Clock();


  animate();



  function animate() {
    requestAnimationFrame(animate);

    // Current total time
    const elapsed = clock.getElapsedTime(); 

    electrons.forEach((p) => {

      // 1) Update angle
      p.angle += p.speed;
  
      // 2) Compute XY position on the orbit (z=0 for XY plane)
      const x = p.radius * Math.cos(p.angle);
      const y = p.radius * Math.sin(p.angle);
      const z = 0;
  
      // 3) Update sphere position
      p.sphere.position.set(x, y, z);
      p.smallGlow.position.set(x, y, z);
      p.largeGlow.position.set(x, y, z);
  
      // 4) Update trail
      p.trailPositions.push(x, y, z);


      // 4-0) update time
      p.trailMaterial.uniforms.uTime.value = elapsed;
      p.trailBirthTimes.push(elapsed);

      // 4-1) Remove old vertices that are fully faded
      //    We'll keep anything within "fadeTime" seconds of now.
      const fadeTime = p.trailMaterial.uniforms.fadeTime.value;
      let removeCount = 0;

      // We'll increment removeCount if a vertex is older than "elapsed - fadeTime"
      for (let i = 0; i < p.trailBirthTimes.length; i++) {
        if (p.trailBirthTimes[i] < elapsed - fadeTime) {
          removeCount++;
        } else {
          break; // Once we find the first that's new enough, stop
        }
      }

      // If removeCount > 0, remove those old positions from the front
      if (removeCount > 0) {
        // Each position is 3 floats
        p.trailPositions.splice(0, removeCount * 3);
        p.trailBirthTimes.splice(0, removeCount);
      }

      // 4) Update geometry attributes
      p.trailGeometry.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(new Float32Array(p.trailPositions), 3)
      );
      p.trailGeometry.setAttribute(
        'birthTime',
        new THREE.Float32BufferAttribute(new Float32Array(p.trailBirthTimes), 1)
      );

      // if (p.trailPositions.length / 3 > 30) { // limit 200 segments
      //   p.trailPositions.splice(0, 3); // remove oldest vertex
      // } 
  
      // p.trailGeometry.setAttribute(
      //   'position',
      //   new THREE.Float32BufferAttribute(
      //     new Float32Array(p.trailPositions),
      //     3
      //   )
      // );
      p.trailGeometry.computeBoundingSphere(); // optional
    });     
    
    // update glowing particles during time
    material.uniforms.uTime.value = performance.now() * 0.001;

    // render scene
    renderer.render( scene, camera );
  }

  function createOrbitingParticle() {
    // (A) Random radius in some range, e.g. [3..11]
    const radius = 10 + Math.random() * 10;
  
    // (B) Random initial angle [0..2π]
    const angle  = Math.random() * Math.PI * 2;

    const direction = Math.round(Math.random()) * 2 - 1;
  
    // (C) Optionally random speed
    const speed  = direction * (0.01 / 10 + Math.random() * 0.01 / 3); // e.g. ~0.01..0.02
  
    // // (D) Particle geometry & material
    // const sphereGeometry = new THREE.SphereGeometry(0.1, 16, 16);
    // const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    // const sphereMesh     = new THREE.Mesh(sphereGeometry, sphereMaterial);
    // // (D-1) Single vertex geometry, point material and a point
    const singleVertex = new THREE.BufferGeometry();
    const vertexPositions = new Float32Array([0, 0, 0]); // Start at (0,0,0)
    singleVertex.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(vertexPositions, 3)
    );
    const greenMaterial = new THREE.PointsMaterial({
      color: 0x00ff00,
      size: 0.5,
    });

    const pointMaterial = createPointMaterial(10.0, "rgb(230,225,219)");
    const glowingMaterial = createGlowingMaterial(30.0, "rgb(0, 255, 161)");
    const glowingMaterial2 = createGlowingMaterial(14.0, "rgb(255, 251, 0)");
    pointMaterial.depthTest = false;

    // // (C) Create the single-particle Points
    const greenParticle = new THREE.Points(singleVertex, pointMaterial);
    const particleSmallGlow = new THREE.Points(singleVertex, glowingMaterial2);
    const particleLargeGlow = new THREE.Points(singleVertex, glowingMaterial);
  
    // (E) Trail
    const trailPositions = []; // will store x,y,z
    const trailGeometry  = new THREE.BufferGeometry();
    // const trailMaterial  = new THREE.LineBasicMaterial({ color: 0x00ff00 });
    // const trailLine      = new THREE.Line(trailGeometry, trailMaterial);

    // (E-1) for fading trail
    const trailBirthTimes = [];
    const vertexShader = `
    uniform float uTime;
    attribute float birthTime;
    varying float vAlpha; // we'll compute alpha in the vertex or fragment, up to you

    uniform float fadeTime;

    void main() {
        // Compute how long ago this vertex was spawned
        float age = uTime - birthTime;
        
        // Convert age to alpha: 
        //   alpha = 1.0 at age=0, alpha=0 at age=fadeTime, then clamp
        float alpha = 1.0 - (age / fadeTime);
        alpha = clamp(alpha, 0.0, 1.0);

        vAlpha = alpha;

        // Standard "line" transformation
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
    `;
    const fragmentShader = `
    varying float vAlpha;
    uniform vec3 uColor;

    void main() {
        // If alpha is ~0, we can discard or just output with 0.0 alpha
        if (vAlpha <= 0.0) {
            discard;
        }
        gl_FragColor = vec4(uColor, vAlpha); // green with fade
    }
    `;
    const trailColor = new THREE.Color("rgb(2, 183, 140)");
    const trailMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime:    { value: 0.0 },
        fadeTime: { value: 1.0 }, // fade out after 2 seconds, adjust as needed
        uColor: { value: new THREE.Vector3(trailColor.r, trailColor.g, trailColor.b) }
      },
      vertexShader,
      fragmentShader,
      transparent: true  // must be true for alpha
    });
    const trailLine = new THREE.Line(trailGeometry, trailMaterial);

    trailMaterial.renderOrder = 0;
    particleLargeGlow.renderOrder = 1;
    particleSmallGlow.renderOrder = 2;
    greenParticle.renderOrder = 3;
  
    // Return an object bundling all we need
    return {
      radius,
      angle,
      speed,
      // sphere: sphereMesh,
      sphere: greenParticle,
      smallGlow: particleSmallGlow,
      largeGlow: particleLargeGlow,
      // to add what gets changed on animation
      trailPositions,
      trailGeometry,
      trailLine,
      // to animate fading trail
      trailBirthTimes,
      trailMaterial
    };
  }

  function createPointMaterial(sizeValue, rgbValue) {
    const value = rgbValue || rgb(255,0,0);
    // Convert hex to a THREE.Color (built-in helper)
    const color = new THREE.Color(value);
    const size = sizeValue || 20.0;

    const vertexShader = `
      uniform float uSize;
      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        
        // Convert the point size from model space to screen space
        // Typically multiply by a scale factor to fit your scene
        gl_PointSize = uSize * (30.0 / -mvPosition.z);

        gl_Position = projectionMatrix * mvPosition;
      }
    `;
    const fragmentShader = `
    uniform vec3 uColor;
    void main() {
      // Convert point coordinate from [-1..1] range to a distance
      vec2 coords = gl_PointCoord - vec2(0.5);
  
      // If distance > radius, discard the fragment
      if (length(coords) > 0.5) discard;
  
      // Otherwise, set a color
      gl_FragColor = vec4(uColor, 1.0);
    }
    `;

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uSize: { value: size },
        uColor: { value: new THREE.Vector3(color.r, color.g, color.b) }
      },
      vertexShader,
      fragmentShader,
      transparent: true
    });

    return material
  }

  function createGlowingMaterial(sizeValue, rgbValue) {
    const value = rgbValue || rgb(255,0,0);
    // Convert hex to a THREE.Color (built-in helper)
    const color = new THREE.Color(value);
    const size = sizeValue || 20.0;

    const vertexShader = `
      uniform float uSize;
      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        
        // Convert the point size from model space to screen space
        // Typically multiply by a scale factor to fit your scene
        gl_PointSize = uSize * (30.0 / -mvPosition.z);

        gl_Position = projectionMatrix * mvPosition;
      }
    `;
    const fragmentShader = `
    uniform vec3 uColor;
    void main() {
      // Convert point coordinate from [-1..1] range to a distance
      vec2 coords = gl_PointCoord - vec2(0.5);
  
      // If distance > radius, discard the fragment
      if (length(coords) > 0.5) discard;

      float dist = length(coords);
      // Now compute alpha so it's 1 at dist=0, and 0 at dist=0.5
      // We'll do a simple linear fade: alpha = 1 - (dist / 0.5)
      float alpha = 1.0 - (dist / 0.5);  
      // alpha = 1 at the center (dist=0)
      // alpha = 0 at the edge (dist=0.5)
  
      // Otherwise, set a color
      gl_FragColor = vec4(uColor, alpha);
    }
    `;

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uSize: { value: size },
        uColor: { value: new THREE.Vector3(color.r, color.g, color.b) }
      },
      vertexShader,
      fragmentShader,
      transparent: true
    });

    return material
  }

  function electron(scene) {
    /* to replace for a sphere */
    // const sphereGeometry = new THREE.SphereGeometry(0.2, 16, 16);
    // const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    // const greenSphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    // scene.add(greenSphere);
    // Then just set greenSphere.position.copy(currentPos) each frame.

    // // (A) Single vertex geometry
    const singleVertex = new THREE.BufferGeometry();
    const vertexPositions = new Float32Array([0, 0, 0]); // Start at (0,0,0)
    singleVertex.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(vertexPositions, 3)
    );

    // // (B) Points material (green)
    const greenMaterial = new THREE.PointsMaterial({
      color: 0x00ff00,
      size: 0.5,
    });

    // // (C) Create the single-particle Points
    const greenParticle = new THREE.Points(singleVertex, greenMaterial);
    scene.add(greenParticle);

    return greenParticle
  }

  function onWindowResize( event ) {

      camera.aspect = window.innerWidth / window.innerHeight;
      
      // adjust the FOV
      camera.fov = ( 360 / Math.PI ) * Math.atan( tanFOV * ( window.innerHeight / windowHeight ) );
      
      camera.updateProjectionMatrix();
      camera.lookAt( scene.position );

      renderer.setSize( window.innerWidth, window.innerHeight );
      renderer.render( scene, camera );
      
  }

  function getRandomColor(min, max) {
    return gsap.utils.pipe(
      gsap.utils.random(0, 1),
      gsap.utils.interpolate(min, max)
    )
  }

  function getRandom(maxValue) {
    return maxValue * Math.random() - maxValue / 2;
  }

  function featureReveal(target, isEven) {
    let tl = gsap.timeline({
        defaults: {
            ease: "none"
        }
    });
    
    const fullScale = gsap.to(target, {
        duration: 10,
        scale: featureFinalScale,
        ease: "none",
        xPercent: () => isEven ? 15 : -15 
    });
    
    const fadesIn = gsap.to(target, {
        duration: 0.5,
        autoAlpha: 1
    });

    const bluresIn = gsap.to(target, {
      duration: 2.5,
      blur: 0
    });
    
    const bluresOut = gsap.to(target, {
        duration: 0.5,
        blur: () => blurLevel / 2
    })
    
    const bluresAndDisappears = gsap.to(target, {
        duration: 0.5,
        blur: blurLevel,
        autoAlpha: 0
    })
    
    tl.add(fullScale);
    tl.add(fadesIn, "<");
    tl.add(bluresIn, "<");
    tl.add(bluresOut, "-=1");
    tl.add(bluresAndDisappears, "-=0.5");

    return tl
  }

  function feature1Reveal(target) {
    let tl = gsap.timeline({
        defaults: {
            ease: "none"
        }
    });
    
    const fullScale = gsap.to(target, {
        duration: 5,
        scale: feature1FinalScale
    })
    
    const bluresOut = gsap.to(target, {
        duration: 0.5,
        blur: () => blurLevel / 2
    })
    
    const bluresAndDisappears = gsap.to(target, {
        duration: 0.5,
        blur: blurLevel,
        autoAlpha: 0
    })
    
    tl.add(fullScale);
    tl.add(bluresOut, "-=1");
    tl.add(bluresAndDisappears, "-=0.5");

    return tl
  }

  function gsapBlur() {
      const blurProperty = gsap.utils.checkPrefix("filter"),
              blurExp = /blur\((.+)?px\)/,
              getBlurMatch = target => (gsap.getProperty(target, blurProperty) || "").match(blurExp) || [];

      gsap.registerPlugin({
          name: "blur",
          get(target) {
          return +(getBlurMatch(target)[1]) || 0;
          },
          init(target, endValue) {
          let data = this,
              filter = gsap.getProperty(target, blurProperty),
              endBlur = "blur(" + endValue + "px)",
              match = getBlurMatch(target)[0],
              index;
          if (filter === "none") {
              filter = "";
          }
          if (match) {
              index = filter.indexOf(match);
              endValue = filter.substr(0, index) + endBlur + filter.substr(index + match.length);
          } else {
              endValue = filter + endBlur;
              filter += filter ? " blur(0px)" : "blur(0px)";
          }
          data.target = target; 
          data.interp = gsap.utils.interpolate(filter, endValue); 
          },
          render(progress, data) {
          data.target.style[blurProperty] = data.interp(progress);
          }
      });
  }

}



function weightedRandom(collection, ease) {
  return gsap.utils.pipe(
      Math.random,            //random number between 0 and 1
      gsap.parseEase(ease),   //apply the ease
      gsap.utils.mapRange(0, 1, -0.5, collection.length-0.5), //map to the index range of the array, stretched by 0.5 each direction because we'll round and want to keep distribution (otherwise linear distribution would be center-weighted slightly)
      gsap.utils.snap(1),     //snap to the closest integer
      i => collection[i]      //return that element from the array
  );
}


function refreshScrollTrigger() {
  const images = document.querySelectorAll('img[loading="lazy"]');
  images.forEach((e, i) => {
    e.onload = () => {
      ScrollTrigger.refresh();
    };
  });
}