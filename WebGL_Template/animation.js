// *******************************************************
// CS 174a Graphics Example Code
// animation.js - The main file and program start point.  The class definition here describes how to display an Animation and how it will react to key and mouse input.  Right now it has 
// very little in it - you will fill it in with all your shape drawing calls and any extra key / mouse controls.  

// Now go down to display() to see where the sample shapes are drawn, and to see where to fill in your own code.

"use strict"
var canvas, canvas_size, gl = null, g_addrs,
	movement = vec2(),	thrust = vec3(), 	looking = false, prev_time = 0, animate = false, animation_time = 0;
		var gouraud = false, color_normals = false, solid = false;
		var psycho_option = false;
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
		
		// gl.clearColor( 0, 0, 0, 1 );			// Background color
		// gl.clearColor(0, 0.74902, 1, 1);
		gl.clearColor(0.254902, 0.411765, 0.882353, 1);

		self.m_cube = new cube();
		self.m_obj = new shape_from_file( "teapot.obj" )
		self.m_axis = new axis();
		self.m_sphere = new sphere( mat4(), 4 );	
		self.m_fan = new triangle_fan_full( 10, mat4() );
		self.m_strip = new rectangular_strip( 1, mat4() );
		self.m_cylinder = new cylindrical_strip( 10, mat4() );

		// 1st parameter is camera matrix.  2nd parameter is the projection:  The matrix that determines how depth is treated.  It projects 3D points onto a plane.
		// self.graphicsState = new GraphicsState( translate(0, 0,-70), perspective(45, canvas.width/canvas.height, .1, 1000), 0 );
		self.graphicsState = new GraphicsState( translate(0, 0,-70), perspective(45, canvas.width/canvas.height, .1, 800), 0);

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

	shortcut.add( "y",     function() { psycho_option = !psycho_option; } );


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

Animation.prototype.draw_petals = function(model_transform, flower) {
	model_transform = mult(model_transform, rotate(20, 1, 0, 0));
	var reset = model_transform;
	var numPetals = flower.NUM_FLOWER_PETALS;
	var angle = 0;

	for (var i = 0; i < numPetals; i++) {
		model_transform = mult(model_transform, rotate(angle, 0, 1, 0));
		model_transform = mult(model_transform, rotate(-7, 1, 0, 0));

		model_transform = mult(model_transform, translate(0, 0, flower.FLOWER_RADIUS + 3 * flower.FLOWER_RADIUS));
		model_transform = mult(model_transform, scale(flower.PETAL_X, flower.PETAL_Y, flower.PETAL_Z));
		this.m_sphere.draw(this.graphicsState, model_transform, flower.PETAL_MATERIAL);
		model_transform = reset;
		angle += 360/numPetals;
	}

	var angle_interleave = 360/numPetals/2;
	for (var i =0; i < numPetals; i++) {
		model_transform = mult(model_transform, rotate(angle + angle_interleave, 0, 1, 0));
		model_transform = mult(model_transform, rotate(-5, 1, 0, 0));

		model_transform = mult(model_transform, translate(0, 0, flower.FLOWER_RADIUS + 3 * flower.FLOWER_RADIUS));
		model_transform = mult(model_transform, scale(flower.PETAL_X, flower.PETAL_Y, flower.PETAL_Z));
		this.m_sphere.draw(this.graphicsState, model_transform, flower.PETAL_MATERIAL);
		model_transform = reset;
		angle += 360/numPetals;
	}
}

Animation.prototype.draw_head = function(model_transform, bee) {
	model_transform = mult (model_transform, scale(bee.HEAD_RADIUS, bee.HEAD_RADIUS, bee.HEAD_RADIUS));
	this.m_sphere.draw( this.graphicsState, model_transform, bee.HEAD_MATERIAL);
	return model_transform;
}

Animation.prototype.draw_thorax = function(model_transform, bee) {
	model_transform = mult (model_transform, scale(bee.THORAX_X, bee.THORAX_Y, bee.THORAX_Z));
	this.m_cube.draw(this.graphicsState, model_transform, bee.THORAX_MATERIAL);
	return model_transform;
}

Animation.prototype.draw_abdomen = function(model_transform, bee) {
	model_transform = mult(model_transform, scale( bee.ABDOMEN_X, bee.ABDOMEN_Y, bee.ABDOMEN_Z));
	this.m_sphere.draw(this.graphicsState, model_transform, bee.ABDOMEN_MATERIAL);
	return model_transform;
}

Animation.prototype.draw_leg_segment = function(model_transform, bee) {
	model_transform = mult(model_transform, scale(bee.LEG_X, bee.LEG_Y, bee.LEG_Z));
	this.m_cube.draw(this.graphicsState, model_transform, bee.LEG_MATERIAL);
	return model_transform;
}

// angle is in degrees
Animation.prototype.draw_leg = function(model_transform, angle, bee) {
	model_transform = mult(model_transform, rotate(-angle, 1, 0, 0));
	model_transform = mult(model_transform, translate(0, -bee.LEG_Y/2, 0));
	this.draw_leg_segment(model_transform, bee);
	model_transform = mult(model_transform, translate(0, -bee.LEG_Y/2, 0));

	model_transform = mult(model_transform, rotate(angle + 15, 1, 0, 0));
	model_transform = mult(model_transform, translate(0, -bee.LEG_Y/2, 0));
	this.draw_leg_segment(model_transform, bee);

	return model_transform;
}

Animation.prototype.draw_wing = function(model_transform, angle, bee) {
	model_transform = mult(model_transform, rotate(-angle, 1, 0, 0));
	model_transform = mult(model_transform, translate (0, 0, bee.WING_Z/2));

	model_transform = mult(model_transform, scale(bee.WING_X, bee.WING_Y, bee.WING_Z));
	this.m_cube.draw(this.graphicsState, model_transform, bee.WING_MATERIAL);	

	return model_transform;
}

Animation.prototype.draw_flower = function(model_transform, flower) {
	var reset = model_transform;
	model_transform = mult(model_transform, scale(flower.FLOWER_RADIUS, flower.FLOWER_RADIUS, flower.FLOWER_RADIUS));
	this.m_sphere.draw(this.graphicsState, model_transform, flower.FLOWER_MATERIAL);
	this.draw_petals(reset, flower);

	return model_transform;
}

Animation.prototype.draw_stem_segment = function(model_transform, flower) {
	model_transform = mult(model_transform, scale(flower.STEM_SEG_X, flower.STEM_SEG_Y, flower.STEM_SEG_Z));
	this.m_cube.draw(this.graphicsState, model_transform, flower.STEM_MATERIAL);

	return model_transform;
}

Animation.prototype.draw_stem = function(model_transform, flower, stem_angle) {
	for (var j = 0; j < flower.NUMBER_OF_STEM_SEGS; j++) {
			model_transform = mult(model_transform, rotate(stem_angle, 0, 0, 1));
			model_transform = mult(model_transform, translate(0, flower.STEM_SEG_Y/2, 0));
			this.draw_stem_segment(model_transform, flower);
			model_transform = mult(model_transform, translate(0, flower.STEM_SEG_Y/2, 0));
	}
	return model_transform;

}

Animation.prototype.draw_stem_and_flower = function(model_transform, flower, stem_angle) {

	model_transform = this.draw_stem(model_transform, flower, stem_angle);
	this.draw_flower(model_transform, flower);

	return model_transform;
}

Animation.prototype.draw_ground = function(model_transform, ground) {
	model_transform = mult(model_transform, scale(ground.GROUND_X, ground.GROUND_Y, ground.GROUND_Z));
	model_transform = mult( model_transform, rotate(90, 0,0,1 ) );
	this.m_strip.draw(this.graphicsState, model_transform, ground.GROUND_MATERIAL);
	//this.m_cube.draw(this.graphicsState, model_transform, material);
	return model_transform;
}

Animation.prototype.draw_bee = function(model_transform, bee) {
	var stack = new Array();
	stack.push(model_transform);
	
	this.draw_thorax(model_transform, bee);
	
	model_transform = mult(model_transform, translate(-(bee.THORAX_X/2 + bee.HEAD_RADIUS), 0, 0));
	this.draw_head(model_transform, bee);
	
	model_transform = stack.pop();
	stack.push(model_transform);
	model_transform = mult(model_transform, translate(bee.THORAX_X/2 + bee.ABDOMEN_X, 0, 0));
	this.draw_abdomen(model_transform, bee);

	model_transform = stack.pop();
	stack.push(model_transform);
	model_transform = mult(model_transform, translate(-bee.THORAX_X/2, -bee.THORAX_Y/2, bee.THORAX_Z/2));
	
	var leg_angle = bee.MAX_LEG_ANGLE * Math.sin(to_radians(this.graphicsState.animation_time/30)) + 20;
	for (var i = 0; i < 3; i++) {
		model_transform = mult(model_transform, translate(bee.THORAX_X/4, 0, 0));
		stack.push(model_transform);
		this.draw_leg(model_transform, leg_angle, bee);
		model_transform = mult(model_transform, translate(0, 0, -bee.THORAX_Z));
		model_transform = mult(model_transform, rotate(180, 0, 1, 0));
		this.draw_leg(model_transform, leg_angle, bee);
		model_transform = stack.pop();
	}

	model_transform = stack.pop();
	model_transform = mult (model_transform, translate(0, bee.THORAX_Y/2, bee.THORAX_Z/2));

	var wing_angle = 25 + bee.MAX_WING_ANGLE * Math.sin(to_radians(this.graphicsState.animation_time));
	this.draw_wing(model_transform, wing_angle, bee);
	model_transform = mult(model_transform, translate(0, 0, -1));
	model_transform = mult(model_transform, rotate(180, 0, 1, 0));
	this.draw_wing(model_transform, wing_angle, bee);

}

function getColor() {
	var r = Math.random();
	var g = Math.random();
	var b = Math.random();

	return new Material( vec4( r, g, b, 1 ), 1, 1, 1, 40 );
}

function getNewColor(number) {
	return new Material(vec4( number, number, number/4, 1), 1, 1, 1, 40);
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
			
		/**********************************
		Start coding here!!!!
		**********************************/


		var stack = new Array();
		stack.push(model_transform);

		var ground = new Ground();
		var flower = new Flower();
		flower.FLOWER_MATERIAL = getNewColor(0.7 + 0.3 * Math.sin(to_radians(this.graphicsState.animation_time/20)));

		model_transform = mult(model_transform, translate(0, -flower.NUMBER_OF_STEM_SEGS * flower.STEM_SEG_Y, 0));
		this.draw_ground(model_transform, ground);
		var stem_angle = flower.MAX_STEM_ANGLE * Math.sin(to_radians(this.graphicsState.animation_time/20));
		this.draw_stem_and_flower(model_transform, flower, stem_angle);	

		model_transform = stack.pop();
		stack.push(model_transform);
		// this.draw_ring_of_balls(model_transform);

		var bee = new Bee();
		
		// for psycho_option press 'y' at your own risk :D
		var b_num = 1;
		if (psycho_option) {
			gl.clearColor(Math.random(), Math.random(), Math.random(), 1);
			b_num = 5;
		}
		else 
			gl.clearColor(0.254902, 0.411765, 0.882353, 1);

		for (var bee_num = 0; bee_num < b_num; bee_num++) {
			// set up up and down movement (y-direction movement)
			var bee_move_y = bee.BEE_FLIGHT_Y_MOVEMENT * Math.sin(this.graphicsState.animation_time/600);
			model_transform = mult(model_transform, translate(0, bee_move_y, 0));

			// set up proper movement around flower
			var bee_angle = this.graphicsState.animation_time/40;
			model_transform = mult(model_transform, rotate(bee_angle, 0, 1, 0));
			model_transform = mult(model_transform, translate(bee.BEE_FLIGHT_RADIUS, 0, 0));
			model_transform = mult(model_transform, rotate(-90, 0, 1, 0));

			this.draw_bee(model_transform, bee);

			bee.BEE_FLIGHT_RADIUS+=3;
			bee.ABDOMEN_MATERIAL = getColor();
		}

	}	

Animation.prototype.update_strings = function( debug_screen_object )		// Strings this particular class contributes to the UI
{
	debug_screen_object.string_map["time"] = "Animation Time: " + this.graphicsState.animation_time/1000 + "s";
	debug_screen_object.string_map["basis"] = "Showing basis: " + this.m_axis.basis_selection;
	debug_screen_object.string_map["animate"] = "Animation " + (animate ? "on" : "off") ;
	debug_screen_object.string_map["thrust"] = "Thrust: " + thrust;
}


// Bee Class
// holds all of the attributes for bee creation
function Bee() {
   	this.BEE_FLIGHT_RADIUS = 12;
	this.BEE_FLIGHT_Y_MOVEMENT = 3;

	this.MAX_WING_ANGLE = 45;
	this.MAX_LEG_ANGLE = 30;

	// dimensions for head
	this.HEAD_MATERIAL = new Material (vec4 (.2, 0, .6, 1), 1, 1, 1, 40); // default blue
	this.HEAD_RADIUS = 1/2;

	// dimensions for thorax (rectangular prism)
	this.THORAX_MATERIAL = new Material( vec4( .3, .3, .3, 1 ), 1, 1, .5, 20 ); // default grey
	this.THORAX_X = 2;
	this.THORAX_Y = 1;
	this.THORAX_Z = 1;

	// dimensions for abdomen (ellipse sphere)
	this.ABDOMEN_MATERIAL = new Material (vec4 (.5, .5, 0, 1), 1, 1, 1, 40); // default yellow
	this.ABDOMEN_X = 2;
	this.ABDOMEN_Y = 1;
	this.ABDOMEN_Z = 1;

	// dimensions for leg segment (rectangular prism)
	this.LEG_MATERIAL = new Material( vec4( .3, .3, .3, 1 ), 1, 1, .5, 20 ); // default grey
	this.LEG_X = 0.2;
	this.LEG_Y = 1;
	this.LEG_Z = 0.2;

	// dimensions for the wing (rectangular prism)
	this.WING_MATERIAL = new Material( vec4( .3, .3, .3, 1 ), 1, 1, .5, 20 ); // default grey
	this.WING_X = 1;
	this.WING_Y = 0.2;
	this.WING_Z = 4;
}

// Flower Class
// holds all of the attributes for flower creation
function Flower() {

	// controls the swaying angle of flower
	this.MAX_STEM_ANGLE = 1;

	// dimensions for flower
	this.FLOWER_MATERIAL = new Material (vec4 (.5, .5, 0, 1), 1, 1, 1, 40); // default yellow
	this.FLOWER_RADIUS = 1;
	this.PETAL_MATERIAL = new Material (vec4 (.4, 0, 0, 1), 1, 1, 1, 40);
	this.NUM_FLOWER_PETALS = 24;
	this.PETAL_X = 0.5;
	this.PETAL_Y = 0.2;
	this.PETAL_Z = 4;

	// dimensions for one stem segment
	this.STEM_MATERIAL = new Material (vec4 (0.333333, 0.419608, 0.184314, 1), 1, 1, 1, 40); // default olive greenPlastic
	this.NUMBER_OF_STEM_SEGS = 24;
	this.STEM_SEG_X = 0.5;
	this.STEM_SEG_Y = 1;
	this.STEM_SEG_Z = 0.5;
}

// Ground Class
// holds all of the attributes for ground creation
function Ground() {
	// dimensions of ground plane
	this.GROUND_MATERIAL = new Material (vec4 (0.180392, 0.545098, 0.341176, 1), 1, 1, 1, 10);
	this.GROUND_X = 150;
	this.GROUND_Y = 0.1;
	this.GROUND_Z = 150;
}