import * as $ from './three.module.js';
import { OrbitControls } from './controls.js'
import { EffectComposer } from '//cdn.skypack.dev/three@0.125.0/examples/jsm/postprocessing/EffectComposer.js?min'
import { RenderPass } from '//cdn.skypack.dev/three@0.125.0/examples/jsm/postprocessing/RenderPass.js?min'
import { UnrealBloomPass } from '//cdn.skypack.dev/three@0.125.0/examples/jsm/postprocessing/UnrealBloomPass.js?min'

//// Boot

const renderer = new $.WebGLRenderer({});
const scene = new $.Scene();
const camera = new $.PerspectiveCamera(75, 2, 20, 12000);
// const controls = new OrbitControls(camera, renderer.domElement);
window.addEventListener('resize', () => {
    const { clientWidth, clientHeight } = renderer.domElement;
    renderer.setSize(clientWidth, clientHeight, false);
    renderer.setPixelRatio(window.devicePixelRatio);
    camera.aspect = clientWidth / clientHeight;
    camera.updateProjectionMatrix();
});
document.body.prepend(renderer.domElement);
window.dispatchEvent(new Event('resize'));

//// Inputs
const size = 5000;
const segs = 200;
const disp = 200;

//// Setup
camera.position.set(1000, 1000, 1200);
camera.lookAt(scene.position);
// controls.autoRotate = false;
// controls.enableDamping = true;
// controls.maxPolarAngle = Math.PI / 2.9;

const light0 = new $.DirectionalLight('white', 1);
light0.position.set(0, 1, 0);
scene.add(light0);

const tex0 = new $.TextureLoader().load('https://images.unsplash.com/photo-1586449480584-34302e933441?ixid=MXwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHw%3D&ixlib=rb-1.2.1&auto=format&fit=crop&w=2250&q=80');

const mesh0 = new $.Mesh(
    new $.PlaneBufferGeometry(size, size, segs, segs).rotateX(-0.5 * Math.PI),
    // f()
    f({ wireframe: false, color: new $.Color('#FFFFFF') })

);
scene.add(mesh0);
const mesh1 = new $.Mesh(
    new $.PlaneBufferGeometry(size, size, segs >> 1, segs >> 1).rotateX(-0.5 * Math.PI),
    f({ wireframe: true, color: new $.Color('#111') })
);
scene.add(mesh1);
mesh1.position.set(0, -2, 0)

//// Make Material
function f({ wireframe, color } = {}) {
    const mat = new $.ShaderMaterial({
        extensions: {
            derivatives: true, // wgl 1
        },
        transparent: true,
        lights: true,
        wireframe: wireframe,// Boolean(wireframe),
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
            yOffset = pow(sin(yOffset * 2.0), 2.0);
            transformed.y += yOffset * ${size.toFixed(1)} / 10.0;
        #endif
        `),
        fragmentShader: `
        varying vec3 vWorldPos;
        uniform float time;
        uniform bool wireframe;
        uniform vec3 color;
       
        ` + $.ShaderLib.standard.fragmentShader.replace(
            "gl_FragColor = vec4( outgoingLight, diffuseColor.a );", `
            gl_FragColor = vec4( outgoingLight, diffuseColor.a );\

            vec3 pos = vWorldPos;

            // generate some radar pings
            float fadeDistance = 2.0;
            float resetTimeSec = 8.0;
            float radarPingSpeed = 0.3;
            vec2 greenPing = vec2(0.0, 0.0);

            float innerTail=0.25;
            float frontierBorder=0.025;
            // vec3 RadarPing(in vec2 uv, in vec2 center, in float innerTail, 
            //     in float frontierBorder, in float timeResetSeconds, 
            //     in float radarPingSpeed, in float fadeDistance)
            // {
                
            vec2 diff = greenPing-pos.xy;
            float r = length(diff);
            float pingTime = mod(time, resetTimeSec) * radarPingSpeed;
    
            float circle;
            // r is the distance to the center.
            // circle = BipCenter---//---innerTail---time---frontierBorder
            //illustration
            //https://sketch.io/render/sk-14b54f90080084bad1602f81cadd4d07.jpeg
            circle += smoothstep(time - innerTail, time, r) * smoothstep(time + frontierBorder,time, r);
            circle *= smoothstep(fadeDistance, 0.0, r); // fade to 0 after fadeDistance
                
            // // return vec3(circle);
            // // }



            
            
            // color += RadarPing(pos.xy, greenPing, 0.25, 0.025, resetTimeSec, radarPingSpeed, fadeDistance) * green;
            gl_FragColor = vec4(vec3(circle), 1.0);
            
            // The length from the center
            // float r = length(pos) *0.0008;
     
            // vec3 mask = vec3(1.0);
            
            // // float a = pow(r, 2.0);
            // // float b = sin(r * 0.8 - 1.6);
            // // float s = sin(a - time * 0.0005 + b);
            // float a = pow(r,2.0);
            // float s = sin(a - time * 0.0005 )*10.0 ;
            // s=pow(s,6.0);
            
            // color *= abs(10.0 / (s * 10.8)) - 0.9;
            // // float a = pow(r,2.0);
            // // float s = sin(a - time * 1.0 )*10.0 ;
            // s=pow(s,6.0);
            // mask *= abs(10.0 / (s * 10.8)) - 0.9;

            // // outputs thr mask
            // // gl_FragColor = vec4(mask, 1.0);
            
            // float radius = ${size.toFixed(1)} * pow(sin(time * 0.00015), 2.0);
            // if (${!wireframe}) {
            //     gl_FragColor = vec4( gl_FragColor.xyz, gl_FragColor.w*mask.x);
            // } else {
            //     gl_FragColor = vec4( color, 1.0 );
            // }
        `)
    });
    /*
    float radius = ${size.toFixed(1)} * pow(sin(time * 0.00015), 2.0);
     if (${!wireframe}) {
                if (length( vWorldPos ) > radius) {
                    discard;
                    gl_FragColor = vec4( gl_FragColor.xyz, 0.0 );
                }else{
                    gl_FragColor = vec4( gl_FragColor.xyz, 0.5 );
                }
            } else {
                if ( length( vWorldPos ) < radius) {
                    gl_FragColor = vec4( color, 0.0 );
                }else{
                    gl_FragColor = vec4( color, 1.0 );
                }
            }
    */
    //gl_FragColor = vec4( color, 1.0 );
    mat.map = mat.uniforms.map.value = tex0;
    mat.displacementMap = mat.uniforms.displacementMap.value = tex0;
    return mat;
}

/// Move object 
var pos = new $.Vector3();
pos.copy(camera.position);
function setRotation(x, y, z) {
    mesh0.rotation.set(x, y, z)
    mesh1.rotation.set(x, y, z)
}
document.body.addEventListener('pointermove', (event) => {
    const xRot = event.clientX / 1000;
    camera.position.set(pos.x, pos.y + ((event.clientY - res.height / 2) / 1), pos.z);
    setRotation(0, xRot, 0)
});



//// Render

const res = new $.Vector2();
window.addEventListener('resize', () => {
    renderer.getDrawingBufferSize(res);
    fx.setSize(res.width, res.height);
});
const fx = new EffectComposer(renderer);
fx.addPass(new RenderPass(scene, camera));
fx.addPass(new UnrealBloomPass(res, 0.5, 0.5, 0.3));

renderer.setAnimationLoop((t) => {
    fx.render();
    mesh0.material.uniforms.time.value = t;
    mesh1.material.uniforms.time.value = t;



    camera.lookAt(mesh1.position);
    // controls.update();
});
