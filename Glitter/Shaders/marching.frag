#version 430
// vec3 camLookDirection = vec3(0.0f, 0.0f, 1.0f);

uniform layout(location = 0) vec2 iResolution;
uniform layout(location = 1) vec3 cam;
uniform layout(location = 2) mat4 view;
uniform layout(location = 3) int Iterations;
uniform layout(location = 4) float Scale;
uniform layout(location = 5) float Power;
uniform layout(location = 6) float Bailout;

out vec4 color;

int MAX_STEPS = 100;

vec3 background = vec3(0.30, .31, 0.32);

struct Circle {
    vec3 centre;
    float radius;
    vec4 color;
};
Circle circle_1 = Circle(vec3(-1.f, 1.50f, 15.0f), 1.0f, vec4(1.0f, 0.4f, 1.0f, 1.0f));
Circle circle_2 = Circle(vec3(-7.5f, 0.0f, 15.0f), 1.0f, vec4(1.0f, 0.4f, 1.0f, 1.0f));

struct Box {
    vec3 centre;
    vec3 boundingBox;
    vec4 color;
};

struct Ray {
    vec3 pos;
    vec3 dir;
};


Ray create_camera_ray(vec2 uv, vec3 camPos, vec3 lookAt, float zoom){
    vec3 facing = normalize(lookAt - camPos);
    vec3 right = cross(vec3(0.0,1.0,0.0),facing);
    vec3 up = cross(facing,right);
    vec3 c=camPos+facing*zoom;
    vec3 startingPoint=c+uv.x*right+uv.y*up;
    vec3 dir=normalize(startingPoint-camPos);
    return Ray(camPos,dir);
}

Box box_1 = Box(vec3(5.0f, 0.0f, 15.0f), vec3(2.0f, 1.0f, 1.0f), vec4(1.0f));

//--- Start Signed Distance functions ---
float signedDistanceCircle(vec3 point, Circle circle) {
    return distance(point, circle.centre) - circle.radius;
}

float sdPyramid( vec3 p, float h)
{
  float m2 = h*h + 0.25;
    
  p.xz = abs(p.xz);
  p.xz = (p.z>p.x) ? p.zx : p.xz;
  p.xz -= 0.5;

  vec3 q = vec3( p.z, h*p.y - 0.5*p.x, h*p.x + 0.5*p.y);
   
  float s = max(-q.x,0.0);
  float t = clamp( (q.y-0.5*p.z)/(m2+0.25), 0.0, 1.0 );
    
  float a = m2*(q.x+s)*(q.x+s) + q.y*q.y;
  float b = m2*(q.x+0.5*t)*(q.x+0.5*t) + (q.y-m2*t)*(q.y-m2*t);
    
  float d2 = min(q.y,-q.x*m2-q.y*0.5) > 0.0 ? 0.0 : min(a,b);
    
  return sqrt( (d2+q.z*q.z)/m2 ) * sign(max(q.z,-p.y));
}


float sdBox( vec3 p, vec3 b )
{
  vec3 q = abs(p) - b;
  return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0);
}

float signedDistanceBox(vec3 point, Box box) {
    vec3 q = abs(point- box.centre) - box.boundingBox;
    return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0);
}
//--- End Signed Distance functions ---

//--- Extra functions ---
float intersectSDF(float distA, float distB) {
    return max(distA, distB);
}

float unionSDF(float distA, float distB) {
    return min(distA, distB);
}

float differenceSDF(float distA, float distB) {
    return max(distA, -distB);
}
//--- End Extra functions ---

//--- SceneSDF ---

float DE(vec3 pos) {
	vec3 z = pos;
	float dr = 1.0;
	float r = 0.0;
	for (int i = 0; i < Iterations ; i++) {
		r = length(z);
		if (r>Bailout) break;
		
		// convert to polar coordinates
		float theta = acos(z.z/r);
		float phi = atan(z.y,z.x);
		dr =  pow( r, Power-1.0)*Power*dr + 1.0;
		
		// scale and rotate the point
		float zr = pow( r,Power);
		theta = theta*Power;
		phi = phi*Power;
		
		// convert back to cartesian coordinates
		z = zr*vec3(sin(theta)*cos(phi), sin(phi)*sin(theta), cos(theta));
		z+=pos;
	}
	return 0.5*log(r)*r/dr;
}

float SceneSDF(vec3 point) {
    // vec3 a1 = vec3(1,1,1);
    // vec3 a2 = vec3(-1,-1,1);
    // vec3 a3 = vec3(1,-1,-1);
    // vec3 a4 = vec3(-1,1,-1);
    // vec3 c;
    // int n = 0;
    // float dist, d;
    // while (n < Iterations) {
    //         c = a1; dist = length(point-a1);
    //         d = length(point-a2); if (d < dist) { c = a2; dist=d; }
    //         d = length(point-a3); if (d < dist) { c = a3; dist=d; }
    //         d = length(point-a4); if (d < dist) { c = a4; dist=d; }
    //     point = Scale*point-c*(Scale-1.0);
    //     n++;
    // }

    // return length(point) * pow(Scale, float(-n));

    return DE(point);
}

//--- End SceneSDF ---

//--- Normal Calculation ---

vec3 calcSceneNormal( vec3 point ) // for function f(point)
{
    const float eps = 0.0001; // or some other value
    const vec2 h = vec2(eps,0);
    return normalize( vec3(SceneSDF(point+h.xyy) - SceneSDF(point-h.xyy),
                           SceneSDF(point+h.yxy) - SceneSDF(point-h.yxy),
                           SceneSDF(point+h.yyx) - SceneSDF(point-h.yyx) ) );
}
vec3 calcCircleNormal( vec3 point, Circle c ) // for function f(point)
{
    const float eps = 0.0001; // or some other value
    const vec2 h = vec2(eps,0);
    return normalize( vec3(signedDistanceCircle(point+h.xyy, c) - signedDistanceCircle(point-h.xyy, c),
                           signedDistanceCircle(point+h.yxy, c) - signedDistanceCircle(point-h.yxy, c),
                           signedDistanceCircle(point+h.yyx, c) - signedDistanceCircle(point-h.yyx, c) ) );
}
vec3 calcBoxNormal( vec3 point, Box b ) // for function f(point)
{
    const float eps = 0.0001; // or some other value
    const vec2 h = vec2(eps,0);
    return normalize( vec3(signedDistanceBox(point+h.xyy, b) - signedDistanceBox(point-h.xyy, b),
                           signedDistanceBox(point+h.yxy, b) - signedDistanceBox(point-h.yxy, b),
                           signedDistanceBox(point+h.yyx, b) - signedDistanceBox(point-h.yyx, b) ) );
}

//--- End Normal Calculation ---

//--- Lighting ---
struct Light {
    vec3 position;
    vec3 color;
    float strength;
};

float ambient = 0.1;
Light light_0 = Light(vec3(5.0f, -3.0f, 3.0f), vec3(1.0f, .6f, 0.3f), 140.0);
Light light_1 = Light(vec3(10.0f, 5.0f, 25.0f), vec3(0.4f, 0.2f, 0.7f), 150.0);
Light light_2 = Light(vec3(-10.0f, -0.0f, 25.0f), vec3(1.0f, 1.0f, 1.0f), 170.0);

float castShadowRay(vec3 point, Light light) {
    float shadow = 1.0f;

    vec3 direction = normalize(light.position - point);
    point = point + direction;

    for (int i = 0; i < MAX_STEPS; i++) {
        float distCircle1 = signedDistanceCircle(point, circle_1);
        float dist = 10.0f;
        if (distCircle1 < dist) {
            dist = distCircle1;
        }

        if(dist <= 0.001f) {
            shadow = 0.0f;
            break;
        }
        float distCircle2 = signedDistanceCircle(point, circle_2);
        if (distCircle2 < dist) {
            dist = distCircle2;
        }

        if(dist <= 0.1f) {
            shadow = 0.0f;
            break;
        }


        float distBox1 = signedDistanceBox(point, box_1);

        if (distBox1 < dist) {
            dist = distBox1;
        }
        if(dist <= 0.1f) {
            shadow = 0.0f;
            break;
        }
        point = point + dist * direction;
    }

    return 1.0f;
}


vec3 phong(vec3 point, vec3 normal, Light light) {
    float strength = 0.0;
    vec3 lightVec = (light.position - point);
    float dist = length(lightVec); // Get the distance
    lightVec = lightVec/dist; // Normalize the light.

    //Calculate the R vector.
    vec3 Reflection = reflect(-lightVec, normal);
    vec3 Eye = normalize(- point); // Calculate the vector from the fragment position to the camera

    float kd = 0.4; // Diffuse coefficent
    float ks = 0.6; // Specular coefficent
    float n = 35.0; // Shinyness factor

    float diffuse = kd * max(0.0, dot(normal, lightVec)); // Calculate diffuse contribution
    float specular = ks * pow(max(0.0, dot(Eye, Reflection)), n); // Calculate specular contribution

    strength = light.strength * ((diffuse + specular) / pow(dist, 2.0)); // Return final light contribution.

    float contribution = castShadowRay(point, light);

    return contribution * strength * light.color;
}

//--- End Lighting ---

vec3 marchRay(vec3 startPoint, vec3 direction, int step) {
    vec3 point = startPoint;

    for (int i = 0; i < MAX_STEPS; i++) {
        float dist = 10.0f;
        
        // float distCircle1 = signedDistanceCircle(point, circle_1);
        // float distCircle2 = signedDistanceCircle(point, circle_2);
        // float distBox1 = signedDistanceBox(point, box_1);

        // float temp = signedDistanceCircle(point, circle_1);

        // if(temp < dist) {
        //     dist = temp;
        // }

        // if(dist <=0.1f) {
        //     vec3 normal = calcCircleNormal(point, circle_1);
        //     return (ambient + phong(point, normal, light_0) + phong(point, normal, light_1) + phong(point, normal, light_2)) * circle_1.color.xyz;
        // }
        // // float distCircle2 = differenceSDF(signedDistanceCircle(point, circle_2), signedDistanceCircle(point, circle_1));
        // temp = signedDistanceCircle(point, circle_2);
        // if (temp < dist) {
        //     dist = temp;
        // }

        // if(dist <= 0.01f) {
        //     vec3 normal = calcCircleNormal(point, circle_2);
        //     return (ambient + phong(point, normal, light_0) + phong(point, normal, light_1) + phong(point, normal, light_2)) * circle_2.color.xyz;
        // }
        
        // temp = signedDistanceBox(point, box_1);

        // if (temp < dist) {
        //     dist = temp;
        // }

        // if(dist <= 0.01f) {
        //     vec3 normal = calcBoxNormal(point, box_1);
        //     return (ambient + phong(point, normal, light_0) + phong(point, normal, light_1) + phong(point, normal, light_2)) * box_1.color.xyz;
        // }

        float sdf = SceneSDF(point - vec3(0.0f, 0.0f, 10.0f));

        if (sdf < dist) {
            dist = sdf;
        }
        
        if (dist <= 0.01) {
            vec3 normal = calcSceneNormal(point - vec3(0.0f, 0.0f, 10.0f));
            return float(i) / float(MAX_STEPS+100) * vec3(1.0f, 1.0f, 0.0f) + (ambient + phong(point, normal, light_0) + phong(point, normal, light_1) + phong(point, normal, light_2));
        }

        point = point + dist * direction;
    }

    return background;
}

void main() {
    vec2 uv = gl_FragCoord.xy / iResolution.xy;
    uv -= vec2(0.5);
    uv.xy *= iResolution.x/iResolution.y;
    vec3 lookdir = vec3(view * vec4(cam + vec3(0, 0, 1.0f), 1.0f));
    Ray r = create_camera_ray(uv, cam, lookdir, 1.0f); // Create_camera_ray function taken from this medium article. https://medium.com/@ArmstrongCS/raymarching-1-the-basics-d6f3e70fb430
    vec3 rayColor =  marchRay(r.pos, r.dir, 0);

    color = vec4(rayColor, 1.0f);
}