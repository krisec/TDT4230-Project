// Local Headers
#include "glitter.hpp"

// System Headers
#include <glad/glad.h>
#include <GLFW/glfw3.h>

// Standard Headers
#include <cstdio>
#include <cstdlib>

// Stolen Shader
#include "shader.hpp"
#include <vector>
#include "GLFunctions.hpp"

#include <chrono>

#include "..\Vendor\imgui\imgui.h"
#include "..\Vendor\imgui\imgui_impl_glfw.h"
#include "..\Vendor\imgui\imgui_impl_opengl3.h"

void rotateCamera(glm::vec3& cameraRotation, GLFWwindow* window);
void moveCamera(glm::vec3& cameraPosition, glm::mat4 cameraRotation, GLFWwindow* window);

auto currentTime = std::chrono::steady_clock::now();
auto lastTime = std::chrono::steady_clock::now();
float timeDelta = 0.0f;

int main(int argc, char * argv[]) {

    // Load GLFW and Create a Window
    glfwInit();
    glfwWindowHint(GLFW_CONTEXT_VERSION_MAJOR, 4);
    glfwWindowHint(GLFW_CONTEXT_VERSION_MINOR, 0);
    glfwWindowHint(GLFW_OPENGL_PROFILE, GLFW_OPENGL_CORE_PROFILE);
    glfwWindowHint(GLFW_OPENGL_FORWARD_COMPAT, GL_TRUE);
    glfwWindowHint(GLFW_RESIZABLE, GL_FALSE);
    auto mWindow = glfwCreateWindow(mWidth, mHeight, "OpenGL", nullptr, nullptr);

    // Check for Valid Context
    if (mWindow == nullptr) {
        fprintf(stderr, "Failed to Create OpenGL Context");
        return EXIT_FAILURE;
    }

    // Create Context and Load OpenGL Functions
    glfwMakeContextCurrent(mWindow);
    gladLoadGL();
    fprintf(stderr, "OpenGL %s\n", glGetString(GL_VERSION));

	Gloom::Shader* shader;
	shader = new Gloom::Shader();
	shader->makeBasicShader("../Glitter/Shaders/simple.vert", "../Glitter/Shaders/marching.frag");
	shader->activate();

	std::vector<float> vertices {
		-1.0, -1.0, 0.0,
		 1.0, -1.0, 0.0,
		-1.0,  1.0, 0.0,
		 1.0,  1.0, 0.0
	};
	std::vector<unsigned int> indices{ 0, 1, 2, 1, 3, 2 };

	GLuint VAO = createVertexArrayObject(vertices, indices);

	glm::vec3 cameraPosition{ 0, 0, 5 };
	glm::vec3 cameraRotation{ 0, 0, 0 };

	int iterations = 10;
	float scale = 2.0f;
	float Power = 3.0f;
	float Bailout = 1.4f;
	

	//cameraRotation = glm::rotate(glm::mat4(1.0f), 0.0f, glm::vec3(1.0f, 0.0f, 0.0f)) * glm::vec4(cameraRotation, 1.0f);

	glm::mat4 rotationMatrix = 
		glm::rotate(glm::mat4(1.0f), glm::radians(cameraRotation.y), glm::vec3(0.0f, 1.0f, 0.0f))
		* glm::rotate(glm::mat4(1.0f), glm::radians(cameraRotation.z), glm::vec3(0.0f, 0.0f, 1.0f))
		* glm::rotate(glm::mat4(1.0f), glm::radians(cameraRotation.x), glm::vec3(1.0f, 0.0f, 0.0f))
	;

	glm::vec3 baseLookDir{ 0, 0, 1 };
	glm::vec3 baseUpVector{ 0, 1, 0 };
	//glm::mat4 perspective = glm::perspective(90, mWidth / mHeight, 10, 100);


	// Setup Dear ImGui context
	IMGUI_CHECKVERSION();
	ImGui::CreateContext();
	ImGuiIO& io = ImGui::GetIO(); (void)io;
	//io.ConfigFlags |= ImGuiConfigFlags_NavEnableKeyboard;     // Enable Keyboard Controls
	//io.ConfigFlags |= ImGuiConfigFlags_NavEnableGamepad;      // Enable Gamepad Controls

	// Setup Dear ImGui style
	ImGui::StyleColorsDark();
	//ImGui::StyleColorsClassic();
	const char* glsl_version = "#version 430";

	// Setup Platform/Renderer bindings
	ImGui_ImplGlfw_InitForOpenGL(mWindow, true);
	ImGui_ImplOpenGL3_Init(glsl_version);

    // Rendering Loop
    while (glfwWindowShouldClose(mWindow) == false) {

		ImGui_ImplOpenGL3_NewFrame();
		ImGui_ImplGlfw_NewFrame();
		ImGui::NewFrame();
        if (glfwGetKey(mWindow, GLFW_KEY_ESCAPE) == GLFW_PRESS)
            glfwSetWindowShouldClose(mWindow, true);
		currentTime = std::chrono::steady_clock::now();
		timeDelta = (currentTime - lastTime).count() / 1000000000.0f;
		lastTime = currentTime;

		rotateCamera(cameraRotation, mWindow);
		rotationMatrix = 
			glm::rotate(glm::mat4(1.0f), glm::radians(cameraRotation.x), glm::vec3(1.0f, 0.0f, 0.0f))
			* glm::rotate(glm::mat4(1.0f), glm::radians(cameraRotation.y), glm::vec3(0.0f, 1.0f, 0.0f))
			* glm::rotate(glm::mat4(1.0f), glm::radians(cameraRotation.z), glm::vec3(0.0f, 0.0f, 1.0f))
		;
		moveCamera(cameraPosition, rotationMatrix, mWindow);
		Power += timeDelta;
		ImGui::Begin("Test!");
		ImGui::SliderInt("Fractal iterations", &iterations, 1, 20);
		ImGui::SliderFloat("x Dir:", &Power, 3.0f, 30.0f);
		ImGui::SliderFloat("y Dir:", &Bailout, 1.0f, 10.0f);
		ImGui::End();

		glm::mat4 view = rotationMatrix;
			//glm::lookAt(cameraPosition, glm::vec3(rotationMatrix * glm::vec4(baseLookDir, 1.0f)), glm::vec3(rotationMatrix * glm::vec4(baseUpVector, 1.0f)));
		// Background Fill Color
        glClearColor(0.25f, 0.25f, 0.25f, 1.0f);
        glClear(GL_COLOR_BUFFER_BIT);
		glBindVertexArray(VAO);
		glUniform2f(0, mWidth, mHeight);
		glUniform3fv(1, 1, glm::value_ptr(cameraPosition));
		glUniformMatrix4fv(2, 1, false, glm::value_ptr(view));
		glUniform1i(3, iterations);
		glUniform1f(4, scale);
		glUniform1f(5, Power);
		glUniform1f(6, Bailout);
		glDrawElements(GL_TRIANGLES, 6, GL_UNSIGNED_INT, 0);

        // Flip Buffers and Draw
		ImGui::Render();
		ImGui_ImplOpenGL3_RenderDrawData(ImGui::GetDrawData());

        glfwSwapBuffers(mWindow);
        glfwPollEvents();
    }   glfwTerminate();

	ImGui_ImplOpenGL3_Shutdown();
	ImGui_ImplGlfw_Shutdown();
	ImGui::DestroyContext();
	shader->destroy();
    return EXIT_SUCCESS;
}

void moveCamera(glm::vec3 &cameraPosition, glm::mat4 cameraRotationMatrix, GLFWwindow *window) {
	glm::vec3 movementDir(0.0f);

	if (glfwGetKey(window, GLFW_KEY_W) == GLFW_PRESS) {
		movementDir.z = 1;
	}
	else if(glfwGetKey(window, GLFW_KEY_S) == GLFW_PRESS) {
		movementDir.z = -1;
	}
	if (glfwGetKey(window, GLFW_KEY_D) == GLFW_PRESS) {
		movementDir.x = 1;
	}
	else if (glfwGetKey(window, GLFW_KEY_A) == GLFW_PRESS) {
		movementDir.x = -1;
	}
	if (glfwGetKey(window, GLFW_KEY_X) == GLFW_PRESS) {
		movementDir.y = 1;
	}
	else if (glfwGetKey(window, GLFW_KEY_Z) == GLFW_PRESS) {
		movementDir.y = -1;
	}

	movementDir = cameraRotationMatrix * glm::vec4(movementDir, 1.0f);
	if (glm::length(movementDir) > 0.0f)
		movementDir = glm::normalize(movementDir);
	cameraPosition +=  movementDir * timeDelta;
}
void rotateCamera(glm::vec3& cameraRotation, GLFWwindow* window) {
	glm::vec3 rotationDir(0.0f);
	if (glfwGetKey(window, GLFW_KEY_E) == GLFW_PRESS) {
		rotationDir.y = 1;
	}
	else if (glfwGetKey(window, GLFW_KEY_Q) == GLFW_PRESS) {
		rotationDir.y = -1;
	}

	if (glm::length(rotationDir) > 0.0f)
		cameraRotation += glm::normalize(rotationDir) * timeDelta * 10.0f;
}
