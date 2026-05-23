const fs = require('fs');
let code = fs.readFileSync('src/game/GameManager.ts', 'utf8');

// 1. Add shakeAmount, hitStopFrames, and heatFilter variables
code = code.replace(
  "  private crosshair!: Graphics;",
  "  private crosshair!: Graphics;\n  private shakeAmount: number = 0;\n  private hitStopFrames: number = 0;\n  private heatFilter!: Filter;"
);

// 2. Initialize Heat Filter in loadAssets or initOpenWorld
const loadAssetsInjection = `
    const noiseTex = await loadTex('/assets/map/rock.svg'); // Just use rock texture as noise for simplicity
    noiseTex.source.addressMode = 'repeat';
    
    // Create Heat Distortion filter
    this.heatFilter = new Filter({
        glProgram: new pixi.GlProgram({
            fragment: \`
                in vec2 vTextureCoord;
                out vec4 finalColor;
                uniform sampler2D uTexture;
                uniform float uTime;
                
                void main() {
                    vec2 uv = vTextureCoord;
                    uv.x += sin(uv.y * 50.0 + uTime * 5.0) * 0.002;
                    uv.y += cos(uv.x * 50.0 + uTime * 3.0) * 0.002;
                    finalColor = texture(uTexture, uv);
                }
            \`,
            vertex: \`
                in vec2 aPosition;
                out vec2 vTextureCoord;
                uniform mat3 uProjectionMatrix;
                void main() {
                    gl_Position = vec4((uProjectionMatrix * vec3(aPosition, 1.0)).xy, 0.0, 1.0);
                    vTextureCoord = aPosition;
                }
            \`
        }),
        resources: {
            uniforms: {
                uTime: { value: 0, type: 'f32' }
            }
        }
    });
`;
// Wait, PixiJS v8 filter syntax is hard to nail without exactly knowing if we import GlProgram.
// The easiest way for Pixi v8 is using the built-in DisplacementFilter!
