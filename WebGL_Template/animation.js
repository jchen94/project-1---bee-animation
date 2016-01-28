// *******************************************************
// CS 174a Graphics Example Code
// animation.js - The main file and program start point.  The class definition here describes how to display an Animation and how it will react to key and mouse input.  Right now it has 
// very little in it - you will fill it in with all your shape drawing calls and any extra key / mouse controls.  

// Now go down to display() to see where the sample shapes are drawn, and to see where to fill in your own code.

"use strict"
var canvas, canvas_size, gl = null, g_addrs,
	movement = vec2(),	thrust = vec3(), 	looking = false, prev_time = 0, animate = false, animation_time = 0;
		var gouraud = false, color_normals = false, solid = false;
function CURRENT_BASIS_IS_WORTH_SHOWING(self, model_transform) { self.m_axis.draw( self.basis_id++, self.graphicsState, model_transform, new Material( vec4( .8,.3,.8,1 ), 1, 1, 1, 40, "" ) ); }


// *******************************************************	
// When the web page's window loads it creates an "Animation" object.  It registers itself as a displayable object to our other class "GL_Context" -- which OpenGL is told to call upon every time a
// draw / keyboard / mouse event happens.

window.onload = function init() {	var anim = new Animation();	}
function Animation()
{
	( function init (self) 
	{
		self.context = new GL_Context( "gl-canvas" );
		self.context.register_display_object( self );
		
		gl.clearColor( 0, 0, 0, 1 );			// Background color

		self.m_cube = new cube();
		self.m_obj = new shape_from_file( "teapot.obj" )
		self.m_axis = new axis();
		self.m_sphere = new sphere( mat4(), 4 );	
		self.m_fan = new triangle_fan_full( 10, mat4() );
		self.m_strip = new rectangular_strip( 1, mat4() );
		self.m_cylinder = new cylindrical_strip( 10, mat4() );

		self.BEE_FLIGHT_RADIUS = 10;
		self.BEE_FLIGHT_Y_MOVEMENT = 3;

		self.MAX_WING_ANGLE = 60;
		self.MAX_LEG_ANGLE = 30;
		self.MAX_STEM_ANGLE = 3;

		// dimensions of ground plane
		self.GROUND_X = 100;
		self.GROUND_Y = 0.1;
		self.GROUND_Z = 20;

		// dimensions for head
		self.HEAD_RADIUS = 1/2;

		// dimensions for flower
		self.FLOWER_RADIUS = 3;

		// dimensions for one stem segment
		self.NUMBER_OF_STEM_SEGS = 8;
		self.STEM_SEG_X = 0.5;
		self.STEM_SEG_Y = 2;
		self.STEM_SEG_Z = 0.5;

		// dimensions for abdomen (ellipse sphere)
		self.ABDOMEN_X = 2;
		self.ABDOMEN_Y = 1;
		self.ABDOMEN_Z = 1;

		// dimensions for thorax (rectangular prism)
		self.THORAX_X = 2;
		self.THORAX_Y = 1;
		self.THORAX_Z = 1;

		// dimensions for leg segment (rectangular prism)
		self.LEG_X = 0.2;
		self.LEG_Y = 1;
		self.LEG_Z = 0.2;

		// dimensions for the wing (rectangular prism)
		self.WING_X = 1;
		self.WING_Y = 0.2;
		self.WING_Z = 4;

		
		// 1st parameter is camera matrix.  2nd parameter is the projection:  The matrix that determines how depth is treated.  It projects 3D points onto a plane.
		self.graphicsState = new GraphicsState( translate(0, 0,-40), perspective(45, canvas.width/canvas.height, .1, 1000), 0 );

		gl.uniform1i( g_addrs.GOURAUD_loc, gouraud);		gl.uniform1i( g_addrs.COLOR_NORMALS_loc, color_normals);		gl.uniform1i( g_addrs.SOLID_loc, solid);
		
		self.context.render();	
	} ) ( this );	
	
	canvas.addEventListener('mousemove', function(e)	{		e = e || window.event;		movement = vec2( e.clientX - canvas.width/2, e.clientY - canvas.height/2, 0);	});
}

// *******************************************************	
// init_keys():  Define any extra keyboard shortcuts here
Animation.prototype.init_keys = function()
{
	shortcut.add( "Space", function() { thrust[1] = -1; } );			shortcut.add( "Space", function() { thrust[1] =  0; }, {'type':'keyup'} );
	shortcut.add( "z",     function() { thrust[1] =  1; } );			shortcut.add( "z",     function() { thrust[1] =  0; }, {'type':'keyup'} );
	shortcut.add( "w",     function() { thrust[2] =  1; } );			shortcut.add( "w",     function() { thrust[2] =  0; }, {'type':'keyup'} );
	shortcut.add( "a",     function() { thrust[0] =  1; } );			shortcut.add( "a",     function() { thrust[0] =  0; }, {'type':'keyup'} );
	shortcut.add( "s",     function() { thrust[2] = -1; } );			shortcut.add( "s",     function() { thrust[2] =  0; }, {'type':'keyup'} );
	shortcut.add( "d",     function() { thrust[0] = -1; } );			shortcut.add( "d",     function() { thrust[0] =  0; }, {'type':'keyup'} );
	shortcut.add( "f",     function() { looking = !looking; } );
	shortcut.add( ",",     ( function(self) { return function() { self.graphicsState.camera_transform = mult( rotate( 3, 0, 0,  1 ), self.graphicsState.camera_transform ); }; } ) (this) ) ;
	shortcut.add( ".",     ( function(self) { return function() { self.graphicsState.camera_transform = mult( rotate( 3, 0, 0, -1 ), self.graphicsState.camera_transform ); }; } ) (this) ) ;

	shortcut.add( "r",     ( function(self) { return function() { self.graphicsState.camera_transform = mat4(); }; } ) (this) );
	shortcut.add( "ALT+s", function() { solid = !solid;					gl.uniform1i( g_addrs.SOLID_loc, solid);	
																		gl.uniform4fv( g_addrs.SOLID_COLOR_loc, vec4(Math.random(), Math.random(), Math.random(), 1) );	 } );
	shortcut.add( "ALT+g", function() { gouraud = !gouraud;				gl.uniform1i( g_addrs.GOURAUD_loc, gouraud);	} );
	shortcut.add( "ALT+n", function() { color_normals = !color_normals;	gl.uniform1i( g_addrs.COLOR_NORMALS_loc, color_normals);	} );
	shortcut.add( "ALT+a", function() { animate = !animate; } );
	
	shortcut.add( "p",     ( function(self) { return function() { self.m_axis.basis_selection++; console.log("Selected Basis: " + self.m_axis.basis_selection ); }; } ) (this) );
	shortcut.add( "m",     ( function(self) { return function() { self.m_axis.basis_selection--; console.log("Selected Basis: " + self.m_axis.basis_selection ); }; } ) (this) );	
}

function update_camera( self, animation_delta_time )
	{
		var leeway = 70, border = 50;
		var degrees_per_frame = .0005 * animation_delta_time;
		var meters_per_frame  = .03 * animation_delta_time;
																					// Determine camera rotation movement first
		var movement_plus  = [ movement[0] + leeway, movement[1] + leeway ];		// movement[] is mouse position relative to canvas center; leeway is a tolerance from the center.
		var movement_minus = [ movement[0] - leeway, movement[1] - leeway ];
		var outside_border = false;
		
		for( var i = 0; i < 2; i++ )
			if ( Math.abs( movement[i] ) > canvas_size[i]/2 - border )	outside_border = true;		// Stop steering if we're on the outer edge of the canvas.

		for( var i = 0; looking && outside_border == false && i < 2; i++ )			// Steer according to "movement" vector, but don't start increasing until outside a leeway window from the center.
		{
			var velocity = ( ( movement_minus[i] > 0 && movement_minus[i] ) || ( movement_plus[i] < 0 && movement_plus[i] ) ) * degrees_per_frame;	// Use movement's quantity unless the &&'s zero it out
			self.graphicsState.camera_transform = mult( rotate( velocity, i, 1-i, 0 ), self.graphicsState.camera_transform );			// On X step, rotate around Y axis, and vice versa.
		}
		self.graphicsState.camera_transform = mult( translate( scale_vec( meters_per_frame, thrust ) ), self.graphicsState.camera_transform );		// Now translation movement of camera, applied in local camera coordinate frame
	}

// *******************************************************	
// display(): called once per frame, whenever OpenGL decides it's time to redraw.
function to_radians(angle_in_degrees) {
	return angle_in_degrees * Math.PI / 180;
}

Animation.prototype.draw_head = function(model_transform, material) {
	model_transform = mult (model_transform, scale(this.HEAD_RADIUS, this.HEAD_RADIUS, this.HEAD_RADIUS));
	this.m_sphere.draw( this.graphicsState, model_transform, material);
	return model_transform;
}

Animation.prototype.draw_thorax = function(model_transform, material) {
	model_transform = mult (model_transform, scale(this.THORAX_X, this.THORAX_Y, this.THORAX_Z));
	this.m_cube.draw(this.graphicsState, model_transform, material);
	return model_transform;
}

Animation.prototype.draw_abdomen = function(model_transform, material) {
	model_transform = mult(model_transform, scale( this.ABDOMEN_X, this.ABDOMEN_Y, this.ABDOMEN_Z));
	this.m_sphere.draw(this.graphicsState, model_transform, material);
	return model_transform;
}

Animation.prototype.draw_leg_segment = function(model_transform, material) {
	model_transform = mult(model_transform, scale(this.LEG_X, this.LEG_Y, this.LEG_Z));
	this.m_cube.draw(this.graphicsState, model_transform, material);
	return model_transform;
}

// angle is in degrees
Animation.prototype.draw_leg = function(model_transform, material, angle) {
	model_transform = mult(model_transform, rotate(-angle, 1, 0, 0));
	model_transform = mult(model_transform, translate(0, -this.LEG_Y/2, 0));
	this.draw_leg_segment(model_transform, material);
	model_transform = mult(model_transform, translate(0, -this.LEG_Y/2, 0));

	model_transform = mult(model_transform, rotate(angle + 15, 1, 0, 0));
	model_transform = mult(model_transform, translate(0, -this.LEG_Y/2, 0));
	this.draw_leg_segment(model_transform, material);

	return model_transform;
}

Animation.prototype.draw_wing = function(model_transform, material, angle) {
	model_transform = mult(model_transform, rotate(-angle, 1, 0, 0));
	model_transform = mult(model_transform, translate (0, 0, this.WING_Z/2));

	model_transform = mult(model_transform, scale(this.WING_X, this.WING_Y, this.WING_Z));
	this.m_cube.draw(this.graphicsState, model_transform, material);	

	return model_transform;
}

Animation.prototype.draw_petal = function(model_transform, material) {
	model_transform = mult(model_transform, scale(1, 1, 0.2));
	this.m_fan.draw(this.graphicsState, model_transform, material);

	return model_transform;
}

Animation.prototype.draw_petals = function(model_transform, material) {

	for (var i = 0; i < 6; i++) {
		model_transform = mult(model_transform, translate (0.5, 0, 0));
		this.draw_petal(model_transform, material);
		model_transform = mult(model_transform, translate (-0.5, 0, 0));
		model_transform = mult(model_transform, rotate(60, 0, 0, 1));
	}

	return model_transform;
}

Animation.prototype.draw_flower = function(model_transform, material) {
	model_transform = mult(model_transform, scale(this.FLOWER_RADIUS, this.FLOWER_RADIUS, this.FLOWER_RADIUS));
	this.m_sphere.draw(this.graphicsState, model_transform, material);

	return model_transform;
}

Animation.prototype.draw_stem_segment = function(model_transform, material) {
	model_transform = mult(model_transform, scale(this.STEM_SEG_X, this.STEM_SEG_Y, this.STEM_SEG_Z));
	this.m_cube.draw(this.graphicsState, model_transform, material);

	return model_transform;
}

// TODO: Trunk parts must rotate around the middle of the bottom face. (4 Points)
// WHAT DOES THAT EVEN MEAN?
Animation.prototype.draw_stem_and_flower = function(model_transform, stem_material, flower_material, stem_angle) {

	for (var j = 0; j < this.NUMBER_OF_STEM_SEGS; j++) {
			model_transform = mult(model_transform, rotate(stem_angle, 0, 0, 1));
			model_transform = mult(model_transform, translate(0, 1, 0));
			this.draw_stem_segment(model_transform, stem_material);
			model_transform = mult(model_transform, translate(0, 1, 0));
	}
	this.draw_flower(model_transform, flower_material);

	return model_transform;
}

Animation.prototype.draw_ground = function(model_transform, material) {
	model_transform = mult(model_transform, scale(this.GROUND_X, this.GROUND_Y, this.GROUND_Z));
	model_transform = mult( model_transform, rotate(90, 0,0,1 ) );
	this.m_strip.draw(this.graphicsState, model_transform, material);
	//this.m_cube.draw(this.graphicsState, model_transform, material);
	return model_transform;
}


Animation.prototype.display = function(time)
	{
		if(!time) time = 0;
		this.animation_delta_time = time - prev_time;
		if(animate) this.graphicsState.animation_time += this.animation_delta_time;
		prev_time = time;

		update_camera( this, this.animation_delta_time );
			
		this.basis_id = 0;
		
		var model_transform = mat4();
		
		var purplePlastic = new Material( vec4( .9, .5, .9, 1 ), 1, 1, 1, 40 ), // Omit the string parameter if you want no texture
			greyPlastic = new Material( vec4( .3, .3, .3, 1 ), 1, 1, .5, 20 ),
			yellowPlastic = new Material (vec4 (.5, .5, 0, 1), 1, 1, 1, 40),
			bluePlastic = new Material (vec4 (.2, 0, .6, 1), 1, 1, 1, 40),
			redPlastic = new Material (vec4 (.4, 0, 0, 1), 1, 1, 1, 40),
			greenPlastic = new Material (vec4 (0.13, 0.545, 0.13, 1), 1, 1, 1, 40),
			darkOlivePlastic = new Material (vec4 (0.333333, 0.419608, 0.184314, 1), 1, 0.5, 0.5, 10),
			earth = new Material( vec4( .5,.5,.5,1 ), 1, 1, 1, 40, "earth.gif" ),
			clearRed = new Material (vec4 (0.4,0, 0,1), 0.5, 0.5, 0.5, 40),
			stars = new Material( vec4( .5,.5,.5,1 ), 1, 1, 1, 40, "stars.png" );
			
		/**********************************
		Start coding here!!!!
		**********************************/
		var stack = new Array();
		stack.push(model_transform);

		model_transform = mult(model_transform, translate(0, -this.NUMBER_OF_STEM_SEGS * this.STEM_SEG_Y, 0));
		this.draw_ground(model_transform, darkOlivePlastic);
		var stem_angle = this.MAX_STEM_ANGLE * Math.sin(to_radians(this.graphicsState.animation_time/20));
		this.draw_stem_and_flower(model_transform, darkOlivePlastic, redPlastic, stem_angle);

		model_transform = stack.pop();

		var bee_angle = this.graphicsState.animation_time/50;
		var bee_move_x = -this.BEE_FLIGHT_RADIUS * Math.sin(to_radians(bee_angle));
		var bee_move_z = -this.BEE_FLIGHT_RADIUS * Math.cos(to_radians(bee_angle));
		var bee_move_y = this.BEE_FLIGHT_Y_MOVEMENT * Math.sin(this.graphicsState.animation_time/1000);

		model_transform = mult(model_transform, translate(bee_move_x, bee_move_y, bee_move_z));
		model_transform = mult(model_transform, rotate( bee_angle, 0, 1, 0 ) );

		stack.push(model_transform);

		this.draw_abdomen(model_transform, yellowPlastic);
		model_transform = mult (model_transform, translate(-(this.ABDOMEN_X + this.THORAX_X/2), 0, 0));

		this.draw_thorax(model_transform, greyPlastic);
		model_transform = mult (model_transform, translate(-(this.THORAX_X/2 + this.HEAD_RADIUS), 0, 0));

		this.draw_head(model_transform, bluePlastic);
		model_transform = mult(model_transform, translate(this.HEAD_RADIUS, -this.THORAX_Y/2, this.THORAX_Z/2));

		var leg_angle = this.MAX_LEG_ANGLE * Math.sin(to_radians(this.graphicsState.animation_time/30)) + 20;
		for (var i = 0; i < 3; i++) {
			model_transform = mult(model_transform, translate(this.THORAX_X/4, 0, 0));
			stack.push(model_transform);
			this.draw_leg(model_transform, greyPlastic, leg_angle);
			model_transform = mult(model_transform, translate(0, 0, -this.THORAX_Z));
			model_transform = mult(model_transform, rotate(180, 0, 1, 0));
			this.draw_leg(model_transform,greyPlastic, leg_angle);
			model_transform = stack.pop();
		}

		model_transform = stack.pop();
		model_transform = mult (model_transform, translate(-(this.ABDOMEN_X + this.THORAX_X/2), this.THORAX_Y/2, this.THORAX_Z/2));

		var wing_angle = this.MAX_WING_ANGLE * Math.sin(to_radians(this.graphicsState.animation_time));
		this.draw_wing(model_transform, greyPlastic, wing_angle);
		model_transform = mult(model_transform, translate(0, 0, -1));
		model_transform = mult(model_transform, rotate(180, 0, 1, 0));
		this.draw_wing(model_transform, greyPlastic, wing_angle);
	}	



Animation.prototype.update_strings = function( debug_screen_object )		// Strings this particular class contributes to the UI
{
	debug_screen_object.string_map["time"] = "Animation Time: " + this.graphicsState.animation_time/1000 + "s";
	debug_screen_object.string_map["basis"] = "Showing basis: " + this.m_axis.basis_selection;
	debug_screen_object.string_map["animate"] = "Animation " + (animate ? "on" : "off") ;
	debug_screen_object.string_map["thrust"] = "Thrust: " + thrust;
}