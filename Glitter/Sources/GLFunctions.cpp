#include "..\Headers\GLFunctions.hpp"
#include <iostream>

GLuint createVertexArrayObject(std::vector<float> vertices, std::vector<unsigned int> indices)
{
	GLuint vaoID;
	glGenVertexArrays(1, &vaoID);
	glBindVertexArray(vaoID);

	std::cout << "Made a vertex array! " << std::endl;

	GLuint bufferid;
	glGenBuffers(1, &bufferid);
	glBindBuffer(GL_ARRAY_BUFFER, bufferid);
	glBufferData(GL_ARRAY_BUFFER, vertices.size() * sizeof(float), &vertices[0], GL_STATIC_DRAW);
	std::cout << "Made a vertex buffer!" << std::endl;

	GLuint vertexAttrib = 0;
	glVertexAttribPointer(vertexAttrib, 3, GL_FLOAT, GL_FALSE, 3 * sizeof(float), 0);
	glEnableVertexAttribArray(vertexAttrib);
	std::cout << "Made a vertex array attrib!" << std::endl;

	GLuint indexBuffer;
	glGenBuffers(1, &indexBuffer);
	glBindBuffer(GL_ELEMENT_ARRAY_BUFFER, indexBuffer);
	glBufferData(GL_ELEMENT_ARRAY_BUFFER, indices.size() * sizeof(unsigned int), &indices[0], GL_STATIC_DRAW);
	std::cout << "Made an index buffer!" << std::endl;

	return vaoID;
}
