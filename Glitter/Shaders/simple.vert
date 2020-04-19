#version 430
in vec3 positon;
void main()
{
    gl_Position = vec4(positon, 1.0f);
}