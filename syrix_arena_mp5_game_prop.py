import bpy
import bmesh
from mathutils import Vector
from math import radians

# ============================================================
# SYRIX ARENA — MP5 GAME PROP
# Blender 5.2.1
# Visual model only
# ============================================================

# ------------------------------------------------------------
# CLEAN SCENE
# ------------------------------------------------------------

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

for datablocks in (
    bpy.data.meshes,
    bpy.data.curves,
    bpy.data.materials,
):
    pass


# ------------------------------------------------------------
# MATERIALS
# ------------------------------------------------------------

def material(name, color, metallic=0.0, roughness=0.45):
    mat = bpy.data.materials.get(name)

    if not mat:
        mat = bpy.data.materials.new(name)

    mat.diffuse_color = (*color, 1.0)

    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")

    if bsdf:
        bsdf.inputs["Base Color"].default_value = (*color, 1.0)
        bsdf.inputs["Metallic"].default_value = metallic
        bsdf.inputs["Roughness"].default_value = roughness

    return mat


MAT_METAL = material(
    "Receiver Metal",
    (0.055, 0.065, 0.075),
    0.72,
    0.30
)

MAT_DARK_METAL = material(
    "Dark Metal",
    (0.025, 0.030, 0.035),
    0.82,
    0.24
)

MAT_POLYMER = material(
    "Black Polymer",
    (0.025, 0.028, 0.030),
    0.05,
    0.55
)

MAT_MAG = material(
    "Magazine Steel",
    (0.045, 0.050, 0.055),
    0.70,
    0.38
)

MAT_RUBBER = material(
    "Stock Rubber",
    (0.012, 0.014, 0.015),
    0.0,
    0.72
)


# ------------------------------------------------------------
# HELPERS
# ------------------------------------------------------------

def smooth(obj):
    if obj.type == 'MESH':
        for p in obj.data.polygons:
            p.use_smooth = True


def bevel(obj, width=0.02, segments=3):

    mod = obj.modifiers.new("Controlled Bevel", 'BEVEL')
    mod.width = width
    mod.segments = segments
    mod.limit_method = 'ANGLE'

    return obj


def cube(
    name,
    location,
    scale,
    material=None,
    bevel_width=0.02,
    rotation=(0, 0, 0)
):

    bpy.ops.mesh.primitive_cube_add(
        size=1,
        location=location,
        rotation=rotation
    )

    obj = bpy.context.object
    obj.name = name

    obj.scale = scale

    bpy.ops.object.transform_apply(
        location=False,
        rotation=False,
        scale=True
    )

    if material:
        obj.data.materials.append(material)

    if bevel_width:
        bevel(obj, bevel_width)

    return obj


def cylinder(
    name,
    location,
    radius,
    depth,
    material=None,
    vertices=32,
    rotation=(0, 0, 0),
    bevel_width=0.008
):

    bpy.ops.mesh.primitive_cylinder_add(
        vertices=vertices,
        radius=radius,
        depth=depth,
        location=location,
        rotation=rotation
    )

    obj = bpy.context.object
    obj.name = name

    if material:
        obj.data.materials.append(material)

    if bevel_width:
        bevel(obj, bevel_width, 2)

    smooth(obj)

    return obj


def uv_sphere(name, location, scale, material=None):

    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=32,
        ring_count=16,
        location=location
    )

    obj = bpy.context.object
    obj.name = name
    obj.scale = scale

    bpy.ops.object.transform_apply(
        location=False,
        rotation=False,
        scale=True
    )

    if material:
        obj.data.materials.append(material)

    smooth(obj)

    return obj


def curve_shape(
    name,
    points,
    bevel_depth,
    material=None,
    resolution=3
):

    curve = bpy.data.curves.new(
        name,
        type='CURVE'
    )

    curve.dimensions = '3D'
    curve.resolution_u = resolution
    curve.bevel_depth = bevel_depth
    curve.bevel_resolution = 3

    spline = curve.splines.new('BEZIER')
    spline.bezier_points.add(len(points) - 1)

    for bp, co in zip(spline.bezier_points, points):
        bp.co = co
        bp.handle_left_type = 'AUTO'
        bp.handle_right_type = 'AUTO'

    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)

    if material:
        obj.data.materials.append(material)

    return obj


# ------------------------------------------------------------
# MAIN DIMENSION SYSTEM
#
# Weapon runs along X.
# Front = positive X
# Rear = negative X
# Up = Z
# ------------------------------------------------------------

# Overall target:
# approximately 700 mm visual proportion
# represented here as ~7 Blender units
#
# This is a GAME MODEL scale approximation.
# ------------------------------------------------------------


# ============================================================
# 1. RECEIVER
# ============================================================

# Main receiver body
receiver = cube(
    "Receiver_Main",
    (0.25, 0.0, 1.82),
    (2.15, 0.34, 0.42),
    MAT_METAL,
    0.09
)

# Upper receiver ridge
upper = cube(
    "Receiver_Upper",
    (0.35, 0.0, 2.12),
    (1.90, 0.28, 0.18),
    MAT_METAL,
    0.07
)

# Rear receiver block
rear = cube(
    "Receiver_Rear",
    (-1.55, 0.0, 1.90),
    (0.42, 0.33, 0.46),
    MAT_METAL,
    0.08
)


# ============================================================
# 2. RECEIVER SIDE CONTOUR
# ============================================================

# Long side reinforcement strip
side_strip = cube(
    "Receiver_Side_Rail",
    (0.15, -0.345, 1.91),
    (1.55, 0.035, 0.13),
    MAT_DARK_METAL,
    0.025
)

# Rear circular pin
cylinder(
    "Rear_Receiver_Pin",
    (-1.25, -0.365, 1.62),
    0.075,
    0.035,
    MAT_DARK_METAL,
    rotation=(radians(90), 0, 0)
)

# Front receiver pin
cylinder(
    "Front_Receiver_Pin",
    (-0.75, -0.365, 1.60),
    0.055,
    0.035,
    MAT_DARK_METAL,
    rotation=(radians(90), 0, 0)
)


# ============================================================
# 3. EJECTION PORT
# ============================================================

ejection = cube(
    "Ejection_Port",
    (0.72, -0.36, 1.88),
    (0.68, 0.025, 0.19),
    MAT_DARK_METAL,
    0.035
)

# Port interior
ejection_inner = cube(
    "Ejection_Port_Inner",
    (0.72, -0.395, 1.88),
    (0.54, 0.018, 0.12),
    MAT_RUBBER,
    0.02
)


# ============================================================
# 4. FRONT HANDGUARD
# ============================================================

# Main polymer handguard
handguard = cube(
    "Handguard_Main",
    (2.25, 0.0, 1.72),
    (1.05, 0.43, 0.48),
    MAT_POLYMER,
    0.13
)

# Slightly narrower front
handguard_front = cube(
    "Handguard_Front",
    (3.15, 0.0, 1.72),
    (0.28, 0.37, 0.40),
    MAT_POLYMER,
    0.11
)

# Lower handguard contour
handguard_lower = cube(
    "Handguard_Lower",
    (2.35, 0.0, 1.34),
    (0.72, 0.34, 0.12),
    MAT_POLYMER,
    0.055
)


# ============================================================
# 5. HANDGUARD VENT DETAILS
# ============================================================

vent_x = [1.72, 2.02, 2.32, 2.62]

for i, x in enumerate(vent_x):

    vent = cube(
        f"Handguard_Vent_{i+1}",
        (x, -0.435, 1.73),
        (0.075, 0.018, 0.16),
        MAT_DARK_METAL,
        0.018,
        rotation=(0, radians(12), 0)
    )


# ============================================================
# 6. BARREL
# ============================================================

barrel = cylinder(
    "Barrel",
    (3.72, 0.0, 1.72),
    0.105,
    1.00,
    MAT_METAL,
    32,
    rotation=(0, radians(90), 0),
    bevel_width=0.012
)

# Barrel shoulder
barrel_shoulder = cylinder(
    "Barrel_Shoulder",
    (3.25, 0.0, 1.72),
    0.16,
    0.18,
    MAT_DARK_METAL,
    32,
    rotation=(0, radians(90), 0),
    bevel_width=0.012
)


# ============================================================
# 7. MUZZLE
# ============================================================

muzzle = cylinder(
    "Muzzle",
    (4.24, 0.0, 1.72),
    0.135,
    0.25,
    MAT_DARK_METAL,
    32,
    rotation=(0, radians(90), 0),
    bevel_width=0.015
)

# Muzzle opening
muzzle_inner = cylinder(
    "Muzzle_Opening",
    (4.37, 0.0, 1.72),
    0.075,
    0.025,
    MAT_RUBBER,
    32,
    rotation=(0, radians(90), 0),
    bevel_width=0.005
)


# ============================================================
# 8. FRONT SIGHT HOOD
# ============================================================

front_base = cube(
    "Front_Sight_Base",
    (3.42, 0.0, 2.02),
    (0.15, 0.17, 0.10),
    MAT_DARK_METAL,
    0.035
)

front_post = cube(
    "Front_Sight_Post",
    (3.48, 0.0, 2.18),
    (0.045, 0.045, 0.16),
    MAT_DARK_METAL,
    0.018
)

front_hood = cube(
    "Front_Sight_Hood",
    (3.48, 0.0, 2.32),
    (0.15, 0.13, 0.055),
    MAT_DARK_METAL,
    0.025
)


# ============================================================
# 9. REAR DIOptER SIGHT
# ============================================================

rear_sight_base = cube(
    "Rear_Sight_Base",
    (-1.18, 0.0, 2.35),
    (0.28, 0.18, 0.10),
    MAT_DARK_METAL,
    0.04
)

rear_sight = cylinder(
    "Rear_Diopter",
    (-1.18, 0.0, 2.49),
    0.17,
    0.20,
    MAT_DARK_METAL,
    32,
    rotation=(radians(90), 0, 0),
    bevel_width=0.015
)

# Center opening visually
rear_hole = cylinder(
    "Rear_Diopter_Hole",
    (-1.18, -0.115, 2.49),
    0.065,
    0.025,
    MAT_RUBBER,
    24,
    rotation=(radians(90), 0, 0),
    bevel_width=0.005
)


# ============================================================
# 10. CHARGING HANDLE
# ============================================================

charging_tube = cylinder(
    "Charging_Handle_Tube",
    (0.05, -0.47, 2.13),
    0.065,
    0.72,
    MAT_DARK_METAL,
    24,
    rotation=(radians(90), 0, 0),
    bevel_width=0.012
)

charging_handle = cube(
    "Charging_Handle",
    (0.05, -0.53, 2.13),
    (0.22, 0.055, 0.065),
    MAT_DARK_METAL,
    0.025
)


# ============================================================
# 11. TRIGGER HOUSING
# ============================================================

trigger_housing = cube(
    "Trigger_Housing",
    (-0.62, 0.0, 1.13),
    (0.52, 0.34, 0.28),
    MAT_POLYMER,
    0.11
)

# Trigger guard
curve_shape(
    "Trigger_Guard",
    [
        (-0.82, -0.37, 1.28),
        (-0.82, -0.37, 0.91),
        (-0.45, -0.37, 0.82),
        (-0.25, -0.37, 1.03)
    ],
    0.055,
    MAT_POLYMER
)

# Trigger
curve_shape(
    "Trigger",
    [
        (-0.56, -0.405, 1.18),
        (-0.55, -0.405, 1.02),
        (-0.43, -0.405, 0.98)
    ],
    0.035,
    MAT_DARK_METAL
)


# ============================================================
# 12. PISTOL GRIP
# ============================================================

grip = cube(
    "Pistol_Grip",
    (-0.42, 0.0, 0.67),
    (0.25, 0.28, 0.52),
    MAT_POLYMER,
    0.12,
    rotation=(0, radians(-12), 0)
)

# Grip bottom
grip_base = cube(
    "Grip_Base",
    (-0.53, 0.0, 0.18),
    (0.27, 0.30, 0.10),
    MAT_POLYMER,
    0.06,
    rotation=(0, radians(-12), 0)
)


# ============================================================
# 13. MAGAZINE
# ============================================================

# Curved magazine made from several connected sections
mag_points = [
    (-0.12, 0.0, 0.94),
    (-0.05, 0.0, 0.72),
    (0.02, 0.0, 0.49),
    (0.08, 0.0, 0.26),
    (0.16, 0.0, 0.08)
]

# Main curved magazine
mag_curve = curve_shape(
    "Magazine_Core",
    mag_points,
    0.20,
    MAT_MAG,
    resolution=4
)

# Flatten visual width by adding side panels
for side in (-1, 1):

    panel = cube(
        f"Magazine_Side_{side}",
        (0.015, side * 0.17, 0.49),
        (0.18, 0.025, 0.55),
        MAT_MAG,
        0.025,
        rotation=(0, radians(7), 0)
    )


# ============================================================
# 14. MAGAZINE FLOORPLATE
# ============================================================

mag_floor = cube(
    "Magazine_Floorplate",
    (0.16, 0.0, -0.08),
    (0.23, 0.22, 0.07),
    MAT_DARK_METAL,
    0.035
)


# ============================================================
# 15. MAGAZINE CATCH
# ============================================================

mag_catch = cube(
    "Magazine_Catch",
    (-0.25, -0.40, 0.97),
    (0.13, 0.035, 0.055),
    MAT_DARK_METAL,
    0.015
)


# ============================================================
# 16. RETRACTABLE STOCK
# ============================================================

# Stock rails
for y in (-0.18, 0.18):

    rail = cube(
        f"Stock_Rail_{y}",
        (-2.05, y, 1.92),
        (0.68, 0.055, 0.07),
        MAT_DARK_METAL,
        0.025
    )

# Stock rear block
stock_body = cube(
    "Stock_Back",
    (-2.72, 0.0, 1.75),
    (0.18, 0.34, 0.48),
    MAT_POLYMER,
    0.10
)

# Stock butt pad
stock_pad = cube(
    "Stock_Buttpad",
    (-2.94, 0.0, 1.70),
    (0.08, 0.30, 0.43),
    MAT_RUBBER,
    0.06
)

# Stock upper/lower support
stock_upper = cube(
    "Stock_Upper",
    (-2.55, 0.0, 2.05),
    (0.30, 0.27, 0.08),
    MAT_POLYMER,
    0.035
)

stock_lower = cube(
    "Stock_Lower",
    (-2.55, 0.0, 1.40),
    (0.30, 0.27, 0.08),
    MAT_POLYMER,
    0.035
)


# ============================================================
# 17. SELECTOR DETAIL
# ============================================================

selector_body = cylinder(
    "Selector",
    (-0.70, -0.39, 1.35),
    0.075,
    0.045,
    MAT_DARK_METAL,
    24,
    rotation=(radians(90), 0, 0),
    bevel_width=0.012
)

selector_lever = cube(
    "Selector_Lever",
    (-0.69, -0.44, 1.40),
    (0.15, 0.035, 0.025),
    MAT_DARK_METAL,
    0.01,
    rotation=(0, 0, radians(-20))
)


# ============================================================
# 18. RECEIVER TOP DETAIL
# ============================================================

top_rail = cube(
    "Receiver_Top_Rail",
    (-0.10, 0.0, 2.36),
    (1.05, 0.12, 0.045),
    MAT_DARK_METAL,
    0.018
)


# ============================================================
# 19. SLING MOUNT
# ============================================================

sling_mount = cylinder(
    "Sling_Mount",
    (-1.85, 0.0, 1.55),
    0.10,
    0.18,
    MAT_DARK_METAL,
    24,
    rotation=(radians(90), 0, 0),
    bevel_width=0.012
)


# ============================================================
# 20. SMALL RECEIVER FASTENERS
# ============================================================

fasteners = [
    (-1.55, 1.72),
    (-1.05, 1.72),
    (-0.72, 1.75),
    (0.25, 1.72),
]

for i, (x, z) in enumerate(fasteners):

    cylinder(
        f"Receiver_Fastener_{i+1}",
        (x, -0.39, z),
        0.025,
        0.025,
        MAT_DARK_METAL,
        16,
        rotation=(radians(90), 0, 0),
        bevel_width=0.005
    )


# ============================================================
# 21. GROUND / DISPLAY
# ============================================================

bpy.ops.object.empty_add(
    type='PLAIN_AXES',
    location=(0, 0, 0)
)

root = bpy.context.object
root.name = "MP5_ROOT"


# Parent all weapon pieces
for obj in list(bpy.context.scene.objects):

    if obj != root and obj.type in {'MESH', 'CURVE'}:
        obj.parent = root


# ============================================================
# 22. WORLD / CAMERA
# ============================================================

bpy.context.scene.world.color = (0.025, 0.025, 0.025)


# Camera
bpy.ops.object.camera_add(
    location=(7.8, -9.5, 5.2)
)

camera = bpy.context.object
camera.name = "Preview_Camera"

camera.rotation_euler = (
    radians(68),
    0,
    radians(39)
)

bpy.context.scene.camera = camera


# ============================================================
# 23. LIGHTING
# ============================================================

bpy.ops.object.light_add(
    type='AREA',
    location=(1.5, -4.0, 6.0)
)

key = bpy.context.object
key.name = "Key_Light"
key.data.energy = 1100
key.data.shape = 'RECTANGLE'
key.data.size = 5.0

key.rotation_euler = (
    radians(25),
    0,
    radians(25)
)


bpy.ops.object.light_add(
    type='AREA',
    location=(-4.0, 3.0, 4.0)
)

fill = bpy.context.object
fill.name = "Fill_Light"
fill.data.energy = 700
fill.data.size = 4.0


bpy.ops.object.light_add(
    type='AREA',
    location=(4.0, 2.0, 3.0)
)

rim = bpy.context.object
rim.name = "Rim_Light"
rim.data.energy = 900
rim.data.size = 3.0


# ============================================================
# 24. VIEWPORT / FINAL
# ============================================================

bpy.context.scene.render.engine = 'BLENDER_EEVEE_NEXT'

# Select root
bpy.ops.object.select_all(action='DESELECT')
root.select_set(True)
bpy.context.view_layer.objects.active = root

print("================================================")
print("SYRIX ARENA MP5 GAME PROP CREATED")
print("Blender 5.2.1")
print("Visual model - no animation")
print("================================================")
