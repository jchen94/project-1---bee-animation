Requirements:
(a) You must use a hierarchical approach to model the complex objects. This applies both
conceptually (hierarchical ordering of your matrix transformations) and programmatically
(organizing your code as a hierarchy of routines). (5 Points)
	COMPLETED? YES.
	Both the bee and flower are broken down into smaller routines. 
	Classes are also created to hold traits (this makes it easy to modify dimensions, etc.)
	i.e. the Bee class holds the bee's dimensions, flight radius, etc., the Flower class
		holds the flower's size, number of segments that compose its stem, etc., the Ground
		class holds the dimensions and color of the ground
	The Bee and Flower are broken down into subroutines (draw_leg, draw_petals, etc.)

(b) Model a static ground plane. (1 Point)
	COMPLETED? YES.

(c) Model a tree that has a trunk made of 8 parts and a sphere for foliage. (2 Points)
	COMPLETED? YES.
	The tree (or in my case, the flower) is made up of 24 stem (trunk) segments.
	The center of the flower is a spehere, and the petals are made of 2 rings of 24 flattened spheres.


(d) The tree must visibly sway as shown by the sample videos. (2 Points)
	COMPLETE? YES.

(e) Trunk parts must rotate around the middle of the bottom face. (4 Points)
	COMPLETED? YES.

(f) Animate the wings and legs of the wasp. You may use the same value for more than one
angle. The wasp’s main axis is X. All moving body parts must rotate around the X-axis.
(5 Points)
	COMPLETED? YES.
	The wasp's wing angle and leg angle can be changed by modifying the fields MAX_WING_ANGLE and
	MAX_LEG_ANGLE in the Bee class.

(g) The wasp must fly in a circle around the vertical axis, and it should always be aligned
with the tangent of the circle. (3 Points)
	COMPLETED? YES.

(h) The wasp must move up and down. (2 Points)
	COMPLETED? YES.

(i) You need not match the exact motion or dimensions of the sample code; however, your
scene must be qualitatively and visually similar to the one shown. You must rotate objects
around the correct points; i.e., where they touch the parent object matters. Pay
special attention to the locations of these hinge/rotation points.
	COMPLETED? YES.

NOTES: added a 'y' key for fun :)