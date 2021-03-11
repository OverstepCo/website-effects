
import * as $ from '//cdn.skypack.dev/three@0.125.0/build/three.module.js?min'
import { Vector3 } from '//cdn.skypack.dev/three@0.125.0/build/three.module.js?min';
import { EffectComposer } from '//cdn.skypack.dev/three@0.125.0/examples/jsm/postprocessing/EffectComposer.js?min'
import { RenderPass } from '//cdn.skypack.dev/three@0.125.0/examples/jsm/postprocessing/RenderPass.js?min'
import { UnrealBloomPass } from '//cdn.skypack.dev/three@0.125.0/examples/jsm/postprocessing/UnrealBloomPass.js?min'



//// Boot
const renderer = new $.WebGLRenderer({});
const scene = new $.Scene();
const camera = new $.PerspectiveCamera(75, 2, 20, 12000);
window.addEventListener('resize', () => {
    const { clientWidth, clientHeight } = renderer.domElement;
    renderer.setSize(clientWidth, clientHeight, false);
    renderer.setPixelRatio(window.devicePixelRatio);
    camera.aspect = clientWidth / clientHeight;
    camera.updateProjectionMatrix();
});
document.body.prepend(renderer.domElement);
window.dispatchEvent(new Event('resize'));

/// Vars
const size = 5000;
const segs = 200;
const disp = 200;

//// Setup
// The cameras starting position
camera.position.set(0, -10, 0);
camera.lookAt(scene.position);

const light0 = new $.DirectionalLight('white', 1);
light0.position.set(0, 1, 0);
scene.add(light0);

// const tex0 = new $.TextureLoader().load('./unknown.png');
const tex0 = new $.TextureLoader().load('./with_logo.png');
// const tex0 = new $.TextureLoader().load('https://images.unsplash.com/photo-1586449480584-34302e933441?ixid=MXwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHw%3D&ixlib=rb-1.2.1&auto=format&fit=crop&w=2250&q=80');
//
// tex0.magFilter = $.LinearFilter;
// tex0.magFilter = $.NearestFilter;

const mesh0 = new $.Mesh(
    new $.PlaneBufferGeometry(size, size, segs, segs).rotateX(-0.5 * Math.PI),
    mat()
);
scene.add(mesh0);
const mesh1 = new $.Mesh(
    new $.PlaneBufferGeometry(size, size, segs >> 1, segs >> 1).rotateX(-0.5 * Math.PI),
    mat({ wireframe: true, color: new $.Color('#111') })
);
scene.add(mesh1);
mesh1.position.set(0, -2, 0)

function mat({ wireframe, color } = {}) {
    const mat = new $.ShaderMaterial({
        extensions: {
            derivatives: true, // wgl 1
        },
        transparent: true,
        lights: true,
        wireframe: Boolean(wireframe),
        uniforms: $.UniformsUtils.merge([
            $.ShaderLib.standard.uniforms, {
                time: { value: 0 },
                displacementScale: { value: disp },
                wireframe: { value: wireframe || false },
                color: { value: color || new $.Color() },
                roughness: { value: 1 },
                metalness: { value: 0 }
            }
        ]),
        vertexShader: `
        varying vec3 vWorldPos;
        uniform float time;
        ` + $.ShaderLib.standard.vertexShader.replace("#include <worldpos_vertex>", `
        // #if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP )
            vec4 worldPosition = vec4( transformed, 1.0 );
            #ifdef USE_INSTANCING
                worldPosition = instanceMatrix * worldPosition;
            #endif
            worldPosition = modelMatrix * worldPosition;
            vWorldPos = worldPosition.xyz;
        // #endif
        `).replace("#include <displacementmap_vertex>", `
        #ifdef USE_DISPLACEMENTMAP
            transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vUv ).x * displacementScale + displacementBias );
            // form a bowl
            float yOffset = length( position.xz ) / ${size.toFixed(1)};
            yOffset = pow(sin(yOffset * 2.0), 3.0);

            // Variables for radar "ping"
            vec2 centerOfPing = vec2(0.0, 0.0);
            float fadeDistance = 4.0;// How fast to fade out
            float resetTimeSec = 6.0;// Time between pulses
            float radarPingSpeed = 0.8;// Rate of travel
            float frontBorder=0.0005;
            float innerBorder=0.9;

            // Init needed vars
            float r = length(centerOfPing-position.xz)*0.0008;// Distance of this point from the center
            float pingTime = mod(time/1000.0, resetTimeSec) * radarPingSpeed;

            // Calculate the circle
            float circle;
            circle += smoothstep(pingTime - innerBorder, pingTime, r) * smoothstep(pingTime + frontBorder,pingTime, r);
            circle *= smoothstep(fadeDistance, 0.0, r); // fade to 0 after fadeDistance

            // yOffset-=position.x;
            // yOffset*=circle/10.0;

            transformed.y*=circle;
            transformed.y += yOffset * ${size.toFixed(1)} / 5.0;

        #endif
        `),
        fragmentShader: `
        varying vec3 vWorldPos;
        uniform float time;
        uniform bool wireframe;
        uniform vec3 color;
        ` + $.ShaderLib.standard.fragmentShader.replace(
            "gl_FragColor = vec4( outgoingLight, diffuseColor.a );", `
            gl_FragColor = vec4( outgoingLight, diffuseColor.a );


            // Variables for radar "ping"
            vec2 centerOfPing = vec2(0.0, 0.0);
            float fadeDistance = 4.0;// How fast to fade out
            float resetTimeSec = 6.0;// Time between pulses
            float radarPingSpeed = 0.8;// Rate of travel
            float frontBorder=0.0005;
            float innerBorder=0.9;

            // Init needed vars
            float r = length(centerOfPing-vWorldPos.xz)*0.0008;// Distance of this point from the center
            float pingTime = mod(time/1000.0, resetTimeSec) * radarPingSpeed;

            // Calculate the circle
            float circle;
            circle += smoothstep(pingTime - innerBorder, pingTime, r) * smoothstep(pingTime + frontBorder,pingTime, r);
            circle *= smoothstep(fadeDistance, 0.0, r); // fade to 0 after fadeDistance

            // gl_FragColor += vec4(vec3(circle),1.0);

            float radius = ${size.toFixed(1)} * pow(sin(time * 0.00015), 2.0);
            if (${!wireframe}) {
                gl_FragColor = vec4( gl_FragColor.xyz, gl_FragColor.w*circle);
            } else {
                gl_FragColor = vec4( vec3(gl_FragColor.x*0.1+0.2), 1.0 );
            }

        `)
    });

    mat.map = mat.uniforms.map.value = tex0;
    mat.displacementMap = mat.uniforms.displacementMap.value = tex0;
    return mat;
}

/// Move object
///The cameras position to animate around(all other transforms are applied on top of this)
const pos = new $.Vector3(1000, 900, 1800);

/// The damping factor(smaller is slower)
const dampingFactor = 0.02;
const scrollFactor = 0.0008;

// The position that the camera will move towards
let targetPosition = new Vector3();
let planeRotationTarget = new Vector3();

// This keeps track of how far the user has scrolled
let scrollRotation = 0;

function updateAnimation() {
    // Find the cam position delta 
    let posDelta = new Vector3().copy(targetPosition);;
    posDelta.sub(camera.position);
    posDelta.multiplyScalar(dampingFactor);

    camera.position.add(posDelta);

    // Find the position too look at
    camera.lookAt((new Vector3().copy(mesh1.position)).add(new Vector3(-1500, -1000, 0)));

    // Find the plane rotation delta
    let rotDelta = new Vector3();
    let currentRotation = mesh0.rotation.toVector3();
    rotDelta.copy(planeRotationTarget);
    // Apply the scroll rotation to the the target
    rotDelta.y -= scrollRotation;
    rotDelta.sub(currentRotation);
    rotDelta.multiplyScalar(dampingFactor);
    currentRotation.add(rotDelta);

    // Sets the rotation of both planes
    mesh0.rotation.setFromVector3(currentRotation);
    mesh1.rotation.setFromVector3(currentRotation);
}

// On pointer move, rotate the plane and move the camera's y axis
document.body.addEventListener('pointermove', (event) => {
    const xRot = event.clientX / 10000;

    targetPosition = new Vector3(pos.x, pos.y + ((event.clientY - res.height / 2) / 2), pos.z);
    planeRotationTarget = new Vector3(0, xRot, 0);

});

document.addEventListener('scroll', (event) => {
    // console.log('window.scrollY');
    console.log(window.scrollY);
    scrollRotation = (window.scrollY) * scrollFactor;
    console.log("Scroll Rotation: " + scrollRotation);
});


//// Render
const res = new $.Vector2();
window.addEventListener('resize', () => {
    renderer.getDrawingBufferSize(res);
    fx.setSize(res.width, res.height);
});
const fx = new EffectComposer(renderer);
fx.addPass(new RenderPass(scene, camera));
fx.addPass(new UnrealBloomPass(res, 2.0, 0.5, 0.2));

renderer.setAnimationLoop((t) => {
    fx.render();

    // Send the time to the shaders
    mesh0.material.uniforms.time.value = t;
    mesh1.material.uniforms.time.value = t;

    updateAnimation();

});