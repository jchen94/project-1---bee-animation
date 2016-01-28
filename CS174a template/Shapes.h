#pragma once
#include "../CS174a template/Utilities.h"

// *******************************************************
// CS 174a Graphics Example Code
// Shape.cpp - Defines a number of objects that inherit from the Shape class.  Each manages lists of its own vertex positions, vertex normals, and texture coordinates per vertex.  
// Instantiating a shape automatically calls OpenGL functions to pass each list into a buffer in the graphics card's memory.

struct Shape
	{
	// *******************************************************
	// IMPORTANT: When you extend the Shape class, these are the four arrays you must put values into.  Each shape has a list of vertex positions (here just called vertices), vertex normals 
	// (vectors that point away from the surface for each vertex), texture coordinates (pixel coordintates in the texture picture, scaled down to the range [ 0.0, 1.0 ] to place each vertex 
	// somewhere relative to the picture), and most importantly - indices, a list of index triples defining which three vertices belong to each triangle.  Your class must build these lists
	// and then send them to the graphics card by calling init_buffers().  At some point a simple example will be given of manually building these lists for a shape.

		std::vector < Vector3d > vertices, normals;
		std::vector < Vector2d > texture_coords;
		std::vector < unsigned > indices;
		std::vector < GLuint > graphics_card_buffers;		// Memory addresses of the buffers given to this shape in the graphics card.
		bool indexed;
		GLuint index_buffer;		
		
		Shape() : indexed(true), graphics_card_buffers(4) { }

		void flat_normals_from_triples( unsigned offset )		// This calculates normals automatically for flat shaded elements, assuming that each element is independent (no shared vertices)
		{
			normals.resize( vertices.size() );
			for( unsigned counter = offset; counter < ( indexed ? indices.size() : vertices.size() ) ; counter += 3 )
			{
				Vector3d a = vertices[ indexed ? indices[ counter     ] : counter     ] ;
				Vector3d b = vertices[ indexed ? indices[ counter + 1 ] : counter + 1 ] ;
				Vector3d c = vertices[ indexed ? indices[ counter + 2 ] : counter + 2 ] ;
	
				Vector3d triangleNormal = ( a - b ).cross( c - a ).normalized();	// Cross two edge vectors of this triangle together to get the normal
				if( ( triangleNormal + a ).norm() < a.norm() )
						triangleNormal *= -1;		// Flip the normal if for some point it brings us closer to the origin
				
				if( triangleNormal[0] != triangleNormal[0] || triangleNormal[1] != triangleNormal[1] ||  triangleNormal[2] != triangleNormal[2] )
				{																	// Did we divide by zero?  Handle it
					normals[ indices[ counter     ] ] = Vector3d( 0, 0, 1 );		
					normals[ indices[ counter + 1 ] ] = Vector3d( 0, 0, 1 );
					normals[ indices[ counter + 2 ] ] = Vector3d( 0, 0, 1 );
					return;
				}
				normals[ indices[ counter     ] ] = Vector3d( triangleNormal[0], triangleNormal[1], triangleNormal[2] );
				normals[ indices[ counter + 1 ] ] = Vector3d( triangleNormal[0], triangleNormal[1], triangleNormal[2] );
				normals[ indices[ counter + 2 ] ] = Vector3d( triangleNormal[0], triangleNormal[1], triangleNormal[2] );
			}
		}

		void spherical_texture_coords ( unsigned vert_index )
		{	texture_coords.push_back( Vector2d( .5 + atan2( vertices[vert_index][2], vertices[vert_index][0] ) / 2 / PI, .5 - 2 * asin( vertices[vert_index][1] ) / 2 / PI ) );
		}

		template < class stlVector > void flatten( std::vector< float > &buffer, stlVector eigenObjects )
		{
			buffer.clear();
			for( auto it = eigenObjects.begin(); it != eigenObjects.end(); it++ )
				for( int i = 0; i < it->size() ; i++ )
					buffer.push_back( float( ( *it ) [i]) );
			glBufferData(GL_ARRAY_BUFFER, buffer.size() * sizeof(float), buffer.data(), GL_STATIC_DRAW );	
		}
		
		void init_buffers()		// Send the completed vertex and index lists to their own buffers in the graphics card.
		{
			std::vector< float > buffer;

			for( int i = 0; i < 4; i++ )
			{
				glGenBuffers( 1, &graphics_card_buffers[i] );
				glBindBuffer(GL_ARRAY_BUFFER, graphics_card_buffers[i]);
				switch(i) {
				case 0: flatten( buffer, vertices ); break;
				case 1: flatten( buffer, normals ); break;
				case 2: flatten( buffer, texture_coords ); break;	}
			}
			
			if( indexed )
			{
				glGenBuffers( 1, &index_buffer );
				glBindBuffer( GL_ELEMENT_ARRAY_BUFFER, index_buffer);
				glBufferData( GL_ELEMENT_ARRAY_BUFFER, indices.size() * sizeof(unsigned), indices.data(), GL_STATIC_DRAW );
			}
		}
	
		void update_uniforms( const GraphicsState& graphicsState, const Matrix4d& model_transform, const Material& material )
		{	
			Matrix4f camera_transform_float				= graphicsState.camera_transform.cast<float>();		 // Send the current matrices to the shader
			Matrix4d camera_model_transform 			= graphicsState.camera_transform * model_transform;
			Matrix4f camera_model_transform_float 		= camera_model_transform.cast<float>();
			Matrix4f projection_camera_model_transform 	= ( graphicsState.projection_transform * camera_model_transform ).cast<float>();
			Matrix3f camera_model_transform_normal		= camera_model_transform.inverse().transpose().topLeftCorner<3, 3>().cast<float>();
				
			glUniformMatrix4fv( g_addrs->camera_transform_loc, 					1, GL_FALSE, camera_transform_float.data() );
			glUniformMatrix4fv( g_addrs->camera_model_transform_loc, 			1, GL_FALSE, camera_model_transform_float.data() );
			glUniformMatrix4fv( g_addrs->projection_camera_model_transform_loc, 1, GL_FALSE, projection_camera_model_transform.data() );
			glUniformMatrix3fv( g_addrs->camera_model_transform_normal_loc,		1, GL_FALSE, camera_model_transform_normal.data() );
				   
			const int N_LIGHTS = 2;
			Vector4f lightPositions[N_LIGHTS], lightColors[N_LIGHTS];
			float lightPositions_flattened[N_LIGHTS * 4], lightColors_flattened[N_LIGHTS * 4];
			lightPositions[0] = Vector4f(   100.f, 0.f, 0.f, 1.f );		lightColors[0] = Vector4f( 0.f, 0.f, 1.f, 1.f );
			lightPositions[1] = Vector4f(   0.f, 100.f, 0.f, 1.f );		lightColors[1] = Vector4f( 1.f, 0.f, 0.f, 1.f );
			for( unsigned i = 0; i < 4 * N_LIGHTS; i++ )
			{
				lightPositions_flattened[i] = lightPositions[i/4](i%4);
				lightColors_flattened[i]    =    lightColors[i/4](i%4);
			}

			glUniform4fv( g_addrs->lightPosition_loc, 	1, lightPositions_flattened );
			glUniform4fv( g_addrs->lightColor_loc, 		1, lightColors_flattened );
			glUniform1f ( g_addrs->ambient_loc,		material.ambient );
			glUniform1f ( g_addrs->diffusivity_loc, material.diffusivity );
			glUniform1f ( g_addrs->shininess_loc,	material.shininess );
			glUniform1f ( g_addrs->smoothness_loc,	material.smoothness );
			glUniform4fv( g_addrs->color_loc, 			1, material.color.data() );	// Send a desired shape-wide color to the graphics card
			glUniform1f	( g_addrs->animation_time_loc, graphicsState.animation_time );
		}

		// The same draw call is used for every shape - the calls draw different things due to the different vertex lists we stored in the graphics card for them.
		void draw( const GraphicsState graphicsState, const Matrix4d& model_transform, const Material& material )
		{
			update_uniforms( graphicsState, model_transform, material );
			
			if( material.texture_filename.length() )		// Use an empty string parameter to signal that we don't want to texture this shape.
			{
				g_addrs->shader_attributes[2].enabled = true;
				glUniform1f ( g_addrs->USE_TEXTURE_loc,  1 );
				glBindTexture( GL_TEXTURE_2D, textures[material.texture_filename]->id );
			}
			else  { glUniform1f ( g_addrs->USE_TEXTURE_loc,  0 );	g_addrs->shader_attributes[2].enabled = false; }
			
			unsigned i = 0;
			for( auto it = g_addrs->shader_attributes.begin(); it != g_addrs->shader_attributes.end(); it++, i++)
				if( it->enabled == GL_TRUE )
				{
					glEnableVertexAttribArray( it->index );
					glBindBuffer( GL_ARRAY_BUFFER, graphics_card_buffers[i] );
					glVertexAttribPointer( it->index, it->size, it->type, it->normalized, it->stride, it->pointer );
				}
				else
					glDisableVertexAttribArray( it->index );

			if( indexed )			
			{
				glBindBuffer( GL_ELEMENT_ARRAY_BUFFER, index_buffer );
				glDrawElements( GL_TRIANGLES, (GLsizei)indices.size(), GL_UNSIGNED_INT, (GLvoid*)0 );
			}
			else
				glDrawArrays  ( GL_TRIANGLES, 0, (GLsizei)vertices.size() );
		}
	};


struct Triangle_Fan_Full : public Shape		// Arrange triangles in a fan.  This version goes all the way around a circle with them.
	{	
		Triangle_Fan_Full( const Matrix4d &points_transform )
		{
			populate( *this, 10, points_transform, -1 );
			init_buffers();
		}
	private:
		static void createCircleVertices ( Shape &recipient, unsigned num_tris ) 
			{	for( unsigned counter = 0; counter <= num_tris; counter++  )
				{
					recipient.vertices.push_back( Vector3d( cos(2 * PI * counter/num_tris), sin(2 * PI * counter/num_tris), -1 ) );	
					recipient.texture_coords.push_back( Vector2d( 1. * counter/num_tris, 1 ) );	
				}
			}
		
		static void initFromSequence ( Shape &recipient, unsigned center_idx, unsigned num_tris, unsigned offset )
			{	
				for( unsigned index = offset; index <= offset + num_tris;	 )
				{
					recipient.indices.push_back( index );
					recipient.indices.push_back( center_idx );
					recipient.indices.push_back( ++index );
				}
				recipient.indices.back() = offset;
			}
	public: 
		static void populate( Shape &recipient, unsigned num_tris, const Matrix4d &points_transform, unsigned center_idx )
			{
				if( center_idx == -1 )			// Not re-using a point?  Create one.
				{
					recipient.vertices.push_back( ( points_transform * Vector4d( 0,0,1,1 ) ).topRows<3>() );
					center_idx = (unsigned)recipient.vertices.size() - 1;
					recipient.texture_coords.push_back( Vector2d( 1, 0 ) );
				}				
				unsigned offset = (unsigned)recipient.vertices.size();		unsigned index_offset = (unsigned)recipient.indices.size();				
			
				createCircleVertices( recipient, num_tris );
				initFromSequence(	  recipient, center_idx, num_tris, offset );
			
				recipient.flat_normals_from_triples( index_offset );	
		
				for( unsigned i = offset; i < recipient.vertices.size(); i++ )
					recipient.vertices[i] = ( points_transform * (Vector4d() << recipient.vertices[ i ], 1).finished() ).topRows<3>();	
			}
	};

struct Triangle_Strip : public Shape		// Arrange triangles in a strip, where the list of vertices alternates sides.
{	
	static void init_from_strip_lists( Shape &recipient, std::vector < Vector3d > &vertices, std::vector < unsigned > &indices )
	{
		unsigned offset = (unsigned)recipient.vertices.size();
			
		for( unsigned counter = 0; counter < vertices.size(); 		)
			recipient.vertices.push_back ( vertices[ counter++ ] );
			
		for( unsigned counter = 0; counter < indices.size() - 2; counter++ )
		{																		// The modulus, used as a conditional here, makes face orientations uniform.
			recipient.indices.push_back( indices[counter + 2 * ((counter+1) % 2 ) ] + offset );		
			recipient.indices.push_back( indices[counter + 1] + offset );
			recipient.indices.push_back( indices[counter + 2 * ( counter    % 2 ) ] + offset );
		}	
	}
};

struct Rectangular_Strip : public Triangle_Strip
{
	Rectangular_Strip( unsigned numRectangles, const Matrix4d &points_transform)
	{
		populate( *this, numRectangles, points_transform );
		init_buffers();
	}

	static void populate( Shape &recipient, unsigned numRectangles, const Matrix4d &points_transform )
		{
			unsigned offset = (unsigned)recipient.vertices.size(),	 index_offset = (unsigned)recipient.indices.size(),
			topIdx = 0,			bottomIdx = numRectangles + 1;
			std::vector < Vector3d > vertices( (numRectangles + 1 ) * 2 );
			std::vector < unsigned > strip_indices;		
			recipient.texture_coords.resize( recipient.texture_coords.size() + (numRectangles + 1 ) * 2 );
			for( unsigned i = 0; i <= numRectangles; i++ )
			{
				vertices[topIdx] 	= Vector3d( 0,  .5, topIdx - .5 * numRectangles );		
					recipient.texture_coords[ topIdx + offset ]    = Vector2d( 1. * topIdx / numRectangles, 1 );
				vertices[bottomIdx] = Vector3d( 0, -.5, topIdx - .5 * numRectangles );		
					recipient.texture_coords[ bottomIdx + offset ] = Vector2d( 1. * topIdx / numRectangles, 0 );
				strip_indices.push_back(topIdx++);
				strip_indices.push_back(bottomIdx++);
			}
					
			init_from_strip_lists(recipient, vertices, strip_indices);
							
			for( unsigned i = offset; i < recipient.vertices.size(); i++ )
				recipient.vertices[i] = ( points_transform * ( Vector4d() << recipient.vertices[i], 1 ).finished() ).topRows<3>();	
			recipient.flat_normals_from_triples( index_offset );
		} 
};



struct Text_Line : public Shape		// Draws a rectangle textured with images of ASCII characters over each quad, spelling out a string.
{
	unsigned max_size;
	Text_Line( unsigned max_size, const Matrix4d &points_transform ) : max_size(max_size)
	{
		Matrix4d object_transform = points_transform;
		for( unsigned i = 0; i < max_size; i++ )
		{
			Rectangular_Strip::populate( *this, 1, object_transform );
			object_transform *= translation(0, 0, -.7);
		}
		init_buffers();
	}

	void set_string( string line )
	{
		for( unsigned i = 0; i < max_size; i++ )
		{
			unsigned row = ( i < line.size() ? line[i] : ' ' ) / 16,
			         col = ( i < line.size() ? line[i] : ' ' ) % 16;
				
			unsigned skip = 3, size = 32, sizefloor = size - skip;
			float dim = size * 16.f, left  = (col * size + skip) / dim, 		top    = (row * size + skip) / dim, 
									right = (col * size + sizefloor) / dim, 	bottom = (row * size + sizefloor + 5) / dim;
			
			texture_coords[ 4 * i ]		= Vector2d( right, top );
			texture_coords[ 4 * i + 1 ] = Vector2d( left, top );
			texture_coords[ 4 * i + 2 ] = Vector2d( right, bottom );
			texture_coords[ 4 * i + 3 ] = Vector2d( left, bottom );
		}

		std::vector< float > buffer;
		glBindBuffer( GL_ARRAY_BUFFER, graphics_card_buffers[2] );
		flatten( buffer, texture_coords );
	}

	void draw_heads_up_display( const GraphicsState &graphicsState, const Matrix4d &model_transform, const Vector4f& color )
	{
		glDisable( GL_DEPTH_TEST );
		Shape::draw( graphicsState, model_transform, Material(color, 1, 1, 1, 40, "text.tga") );	
		glEnable( GL_DEPTH_TEST );
	}
};





struct Cylindrical_Strip : public Triangle_Strip
{
	Cylindrical_Strip( unsigned numRectangles, const Matrix4d &points_transform )
	{
		populate( *this, numRectangles, points_transform );
		init_buffers();
	}

	static void populate( Shape &recipient, unsigned numRectangles, const Matrix4d &points_transform )	
	{	
		std::vector < Vector3d > vertices( numRectangles * 2 );
		std::vector < unsigned > strip_indices;
		unsigned offset = (unsigned)recipient.vertices.size(),	 index_offset = (unsigned)recipient.indices.size(),
			topIdx = 0,			bottomIdx = numRectangles;
						
		recipient.texture_coords.resize( recipient.texture_coords.size() + numRectangles * 2 );
		for( unsigned i = 0; i < numRectangles; i++ )
		{
			vertices[topIdx] 	= Vector3d( cos(2 * PI * topIdx / numRectangles), sin(2 * PI * topIdx / numRectangles), .5 );	
			recipient.texture_coords[topIdx + offset]    = Vector2d(0, 1. * topIdx / numRectangles );
			vertices[bottomIdx] = Vector3d( cos(2 * PI * topIdx / numRectangles), sin(2 * PI * topIdx / numRectangles), -.5 );			
			recipient.texture_coords[bottomIdx + offset] = Vector2d(1, 1. * topIdx / numRectangles );
			strip_indices.push_back(topIdx++);
			strip_indices.push_back(bottomIdx++);
		}
		strip_indices.push_back( 0 );
		strip_indices.push_back( numRectangles );
								
		init_from_strip_lists(recipient, vertices, strip_indices);
							
		for( unsigned i = offset; i < recipient.vertices.size(); i++ )
			recipient.vertices[i] = ( points_transform * (Vector4d() << recipient.vertices[i], 1 ).finished() ).topRows<3>() ;	
		recipient.flat_normals_from_triples( index_offset );
	}
};




struct Cube : public Shape
{
	Cube( const Matrix4d &points_transform )
	{
		populate( *this, points_transform );
		init_buffers();
	}
	static void populate( Shape &recipient, const Matrix4d &points_transform )	
	{	
		for( unsigned i = 0; i < 3; i++ )			// Build a cube by inserting six triangle strips into the lists.
				for( unsigned j = 0; j < 2; j++ )
					Rectangular_Strip::populate( recipient, 1, points_transform * 
						rotation( PI / 2, Vector3d( i==0, i==1, i==2 ) ) *  translation( j - .5, 0, 0 ) );
	}
};

// Build a sphere using subdivision, starting with a tetrahedron.  Store each level of detail in separate index lists.
struct Sphere : public Shape
{	
	std::vector < std::vector < unsigned > > indices_LOD;
	GLuint* index_buffer_LOD;
	Sphere( const Matrix4d &points_transform, unsigned max_subdivisions ) : indices_LOD( max_subdivisions + 1 )
	{
		vertices.push_back(		Vector3d(0.0, 0.0, -1.0) 				 );
		vertices.push_back(		Vector3d(0.0, 0.942809, 0.333333) 		 );
		vertices.push_back(		Vector3d(-0.816497, -0.471405, 0.333333) );
		vertices.push_back(		Vector3d(0.816497, -0.471405, 0.333333)  );
			
		subdivideTriangle( 0, 1, 2, max_subdivisions);
		subdivideTriangle( 3, 2, 1, max_subdivisions);
		subdivideTriangle( 1, 0, 3, max_subdivisions);
		subdivideTriangle( 0, 2, 3, max_subdivisions); 
			
		for( unsigned i = 0; i < vertices.size(); i++ )
		{
			spherical_texture_coords( i );
			normals.push_back( vertices[i] );	
		}

		index_buffer_LOD = new GLuint[max_subdivisions + 1];
		glGenBuffers( max_subdivisions, index_buffer_LOD + 1 );

		for( unsigned i = 1; i <= max_subdivisions; i++ )
		{
			glBindBuffer(GL_ELEMENT_ARRAY_BUFFER, index_buffer_LOD[ i ] );
			glBufferData( GL_ELEMENT_ARRAY_BUFFER,  indices_LOD[i].size() * sizeof(unsigned), indices_LOD[i].data(), GL_STATIC_DRAW );
		}
			
		init_buffers();
	}
		
	void populate( Shape &recipient, const Matrix4d &points_transform, unsigned LOD )
	{
		unsigned offset = (unsigned)recipient.vertices.size();
		for( unsigned i = 0; i < vertices.size(); i++ )
		{	
			recipient.normals .push_back( vertices[i] );	
			recipient.vertices.push_back( ( points_transform * (Vector4d() << vertices[i], 1 ).finished() ).topRows<3>() );
			recipient.spherical_texture_coords( i );
		}
		std::vector<unsigned> &this_LOD = LOD ? indices_LOD[ LOD ] : indices;
		for( unsigned i = 0; i < indices.size(); i++ )
			recipient.indices.push_back( this_LOD[i] + offset );
	}

	void draw( const GraphicsState &graphicsState, const Matrix4d &model_transform, const Material &material, int LOD )
	{ 	
		update_uniforms( graphicsState, model_transform, material );

		if( material.texture_filename.length() )		// Use an empty string parameter to signal that we don't want to texture this shape.
		{
			g_addrs->shader_attributes[2].enabled = true;
			glUniform1f ( g_addrs->USE_TEXTURE_loc,  1 );
			glBindTexture( GL_TEXTURE_2D, textures[material.texture_filename]->id );
		}
		else  { glUniform1f ( g_addrs->USE_TEXTURE_loc,  0 );	g_addrs->shader_attributes[2].enabled = false; }

		unsigned i = 0;
		for( auto it = g_addrs->shader_attributes.begin(); it != g_addrs->shader_attributes.end(); it++, i++)
			if( it->enabled == GL_TRUE )
			{
				glEnableVertexAttribArray( it->index );
				glBindBuffer( GL_ARRAY_BUFFER, graphics_card_buffers[i] );
				glVertexAttribPointer( it->index, it->size, it->type, it->normalized, it->stride, it->pointer );
			}
			else
				glDisableVertexAttribArray( it->index );

		if( LOD < 0 || LOD + 1 >= (int)indices_LOD.size() )
		{
			glBindBuffer( GL_ELEMENT_ARRAY_BUFFER, index_buffer );
			glDrawElements( GL_TRIANGLES, (GLsizei)indices.size(), GL_UNSIGNED_INT, (GLvoid*)0 );
		}
		else
		{
			glBindBuffer( GL_ELEMENT_ARRAY_BUFFER, index_buffer_LOD[ indices_LOD.size() - 1 - LOD ] );
			glDrawElements( GL_TRIANGLES, (GLsizei)indices_LOD[ indices_LOD.size() - 1 - LOD ].size(), GL_UNSIGNED_INT, (GLvoid*)0 );
		}			
	}		
private:
	void subdivideTriangle( unsigned a, unsigned b, unsigned c, int count ) 
	{	
		( count ? indices_LOD[count] : indices ).push_back(a);
		( count ? indices_LOD[count] : indices ).push_back(b);
		( count ? indices_LOD[count] : indices ).push_back(c);
		if( !count ) return;	// Build index list with the nice property that skipping every fourth vertex index takes you down one level of detail, each time				
		Vector3d ab_vert = ( vertices[a] + vertices[b] ).normalized();
		Vector3d ac_vert = ( vertices[a] + vertices[c] ).normalized();
		Vector3d bc_vert = ( vertices[b] + vertices[c] ).normalized();	
						
		unsigned ab = (unsigned)vertices.size();		vertices.push_back( ab_vert );	
		unsigned ac = (unsigned)vertices.size();		vertices.push_back( ac_vert );
		unsigned bc = (unsigned)vertices.size();		vertices.push_back( bc_vert );	

		subdivideTriangle( a, ab, ac,  count - 1 );
		subdivideTriangle( ab, b, bc,  count - 1 );
		subdivideTriangle( ac, bc, c,  count - 1 );
		subdivideTriangle( ab, bc, ac, count - 1 );
	}
};

struct Axis : public Shape
{
	int basis_selection;
	Axis( const Matrix4d &points_transform ) : basis_selection(0)
	{
		populate( *this, points_transform );
		init_buffers();
	}
	// Only draw this set of axes if it is the one selected through the user interface.
	void draw( int current, const GraphicsState &graphicsState, const Matrix4d &model_transform, const Material& material )
		{	if( basis_selection == current ) Shape::draw(graphicsState, model_transform, material );	}

	static void populate( Shape &recipient, const Matrix4d &points_transform )	
	{
		Matrix4d object_transform = Matrix4d::Identity();
		object_transform *= scale( .25, .25, .25 );
		(new Sphere( Matrix4d::Identity(), 3 ) )->populate( recipient, object_transform, 0 );
		object_transform = Matrix4d::Identity();
		drawOneAxis(recipient, object_transform);
		object_transform *= rotation( -PI/2, Vector3d( 1, 0, 0 ) );
		object_transform *= scale( 1, -1, 1 );
		drawOneAxis(recipient, object_transform);
		object_transform *= rotation( PI/2, Vector3d( 0, 1, 0 ) );
		object_transform *= scale( -1, 1, 1 );
		drawOneAxis(recipient, object_transform);
	}
private:	
	static void drawOneAxis( Shape &recipient, const Matrix4d &points_transform )
	{
		Matrix4d original(points_transform), object_transform(points_transform);
		object_transform *= translation( 0, 0, 4 );
		object_transform *= scale( .25, .25, .25 );
		Triangle_Fan_Full::populate ( recipient, 10, object_transform, -1 );
		object_transform = original;
		object_transform *= translation( 1, 1, .5 );
		object_transform *= scale( .1, .1, 1 );
		Cube::populate( recipient, object_transform );
		object_transform = original;
		object_transform *= translation( 1, 0, .5 );
		object_transform *= scale( .1, .1, 1 );
		Cube::populate( recipient, object_transform );
		object_transform = original;
		object_transform *= translation( 0, 1, .5 );
		object_transform *= scale( .1, .1, 1 );
		Cube::populate( recipient, object_transform );
		object_transform = original;			
		object_transform *= translation( 0, 0, 2 );
		object_transform *= scale( .1, .1, 4 );
		Cylindrical_Strip::populate( recipient, 7, object_transform );
	}
};
