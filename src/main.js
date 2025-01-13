import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { mx_bilerp_0 } from 'three/src/nodes/materialx/lib/mx_noise.js';

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
  const hasOrbitControls = false;

  const cameraFromZ = 18;
  const cameraToZ = 5;
  const feature1FinalScale = 1.4;
  const featureFinalScale = 1.2;
  const blurLevel = 6;


  const balls = 20;
  const size = .12;

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
  const geometry1 = new THREE.BufferGeometry();

  const vertices = [];

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

    color.setRGB( channelColor, channelColor, channelColor, THREE.SRGBColorSpace );

    colors.push( color.r, color.g, color.b );

  }

  geometry0.setAttribute( 'position', new THREE.Float32BufferAttribute( vertices, 3 ) );
  geometry1.setAttribute( 'position', new THREE.Float32BufferAttribute( vertices.slice(), 3 ) );

  geometry0.setAttribute( 'color', new THREE.Float32BufferAttribute( colors, 3 ) );

  // one dot made with mask to make rectangle look circle
  const canvas2 = document.createElement( 'canvas' );
  canvas2.width = 128;
  canvas2.height = 128;
  const context = canvas2.getContext( '2d' );
  context.arc( 64, 64, 64, 0, 2 * Math.PI );
  context.fillStyle = dotColor;
  context.fill();
  const texture = new THREE.CanvasTexture( canvas2 );
  texture.colorSpace = THREE.SRGBColorSpace;

  const material = new THREE.PointsMaterial( { size: size, map: texture, transparent: true, alphaTest: 0.1, vertexColors: true } );

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

  // ST to features
  gsapBlur();
  const features = document.querySelectorAll(".feature");

  for (let i = 0; i < features.length; i++) {
      features[i].style.zIndex = features.length - i;
  }

  gsap.set(".feature", {
    blur: blurLevel,
    scale: 0.5,
    autoAlpha: 0
  });

  gsap.set(".feature_1", {
    scale: 1,
    blur: 0,
    xPercent: -50,
    yPercent: -50,
    autoAlpha: 1
  })

  let master = gsap.timeline({
    scrollTrigger: {
        trigger: ".webgl-sphere",
        start: "top top",
        end: "bottom bottom",
        scrub: 0.5,
        // markers: true
    }
  });

  // const feature1Animation = feature1Reveal(".feature_1");

  features.forEach((e, i) => {
    if (i == 0) {
      master.add( feature1Reveal(e) );
    } else {
      master.add( featureReveal(e) );
    }
  })

  // master.add(feature1Animation);
  // master.add(feature2Animation, "-=1");
  // master.add(feature3Animation, "-=1");

  animate();

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

  function feature1Reveal(target) {
    let tl = gsap.timeline({
        defaults: {
            ease: "none"
        }
    });
    
    const fullScale = gsap.to(target, {
        duration: 5,
        scale: feature1FinalScale,
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

  function featureReveal(target) {
    let tl = gsap.timeline({
        defaults: {
            ease: "none"
        }
    });
    
    const fullScale = gsap.to(target, {
        duration: 10,
        scale: featureFinalScale,
        ease: "none"
    });
    
    const bluresIn = gsap.to(target, {
        duration: 1,
        blur: 0,
        autoAlpha: 1
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
    tl.add(bluresIn, "<");
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

function animate() {
  // camera.position.z -= 0.01;
  // electron.position.x += 0.01;
  // electron.position.y += 0.01;
  requestAnimationFrame(animate);
  renderer.render( scene, camera );
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


function cubeInit() {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

  const renderer = new THREE.WebGLRenderer({canvas: canvas});
  renderer.setSize( window.innerWidth, window.innerHeight );
  renderer.setAnimationLoop( animate );
  // document.body.appendChild( renderer.domElement );

  const geometry = new THREE.BoxGeometry( 1, 1, 1 );
  const material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
  const cube = new THREE.Mesh( geometry, material );
  scene.add( cube );

  const controls = new OrbitControls( camera, renderer.domElement );

  camera.position.z = 5;

  function animate() {

    // cube.rotation.x += 0.01;
    // cube.rotation.y += 0.01;

    renderer.render( scene, camera );

  }
}