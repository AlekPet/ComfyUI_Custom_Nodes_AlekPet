# PainterNode in ComflyUI for ControlNet

> PainterNode allows you to draw in the node window, for later use in the ControlNet or in any other node.

## Changelog:

> 2024.05.10 - Implement piping in an image ([issue in an image](https://github.com/AlekPet/ComfyUI_Custom_Nodes_AlekPet/issues/24)) ([example Piping in an image](#piping))

> 2024.04.11 - Implement **MyPaint** brush tool ([issue MyPaint Brush make](https://github.com/AlekPet/ComfyUI_Custom_Nodes_AlekPet/issues/36))

> 2024.02.05 - Add Symmetry Brush and change structures toolbar options ([examle Symmetry Brush](#symmetry-brush))

> Features:

- Ability to draw shapes (circle, square, triangle, line), and use pencil and erase
- Set fill color with transparency
- Set color with transparency and line weight
- Set the background
- Use the resize mod to move, rotate and resize drawn objects
- Prohibition of certain modifications in the change mode, prohibition of movement along certain axes, scaling and rotation
- Support brushes mypaint (MyPaint Brush tool)

# Example

![Screenshot PainterNode connecting to ControlNet](https://github.com/AlekPet/ComfyUI_Custom_Nodes_AlekPet/raw/master/PainterNode/painter_node_example.jpg)

# Symmetry Brush

![Screenshot PainterNode Symmetry Brush](https://github.com/AlekPet/ComfyUI_Custom_Nodes_AlekPet/raw/master/PainterNode/symmetryBrush.jpg)

# MyPaint Brush (tools)

![Screenshot MyPaint Brush](https://github.com/AlekPet/ComfyUI_Custom_Nodes_AlekPet/raw/master/PainterNode/mypaintBrush.jpg)

### Thanks to [Mypaint team](https://github.com/mypaint "Github mypaint") and [Yap Cheah Shen](https://github.com/yapcheahshen "Github Yap Cheah Shen") for his library [brushlib.js](https://github.com/yapcheahshen/brushlib.js "Github brushlib.js"), none of this would have happened without it 😉!

Rights to brushes belong to their owners, [licensing-policy](https://github.com/mypaint/mypaint-brushes?tab=readme-ov-file#licensing-policy).

#### List of [brushes](https://github.com/mypaint/mypaint-brushes/tree/master/brushes "Brushes"):

- [Classic](https://github.com/mypaint/mypaint-brushes/tree/master/brushes/classic)
- [Concept Design (C_D)](https://github.com/mypaint/mypaint/wiki/Brush-Packages#concept-design-c_d)
- [Deevad4](https://www.davidrevoy.com/article55/mypaint-v4-brushkit)

  New version is not working [Deevad](https://github.com/mypaint/mypaint-brushes/tree/master/brushes/deevad)

  Author site: [Deevad4](https://www.davidrevoy.com)

- [Experimental](https://github.com/mypaint/mypaint-brushes/tree/master/brushes/experimental)
- [Kaerhon_v1](https://github.com/mypaint/mypaint-brushes/tree/master/brushes/kaerhon_v1)
- [Ramon](https://github.com/mypaint/mypaint-brushes/tree/master/brushes/ramon)
- [Tanda](https://github.com/mypaint/mypaint-brushes/tree/master/brushes/tanda)
- [Dieterle](https://github.com/mypaint/mypaint-brushes/tree/master/brushes/dieterle) (doesn't work, not added to brushes)

[More brushes mypaint is here](https://github.com/mypaint/mypaint/wiki/Brush-Packages)

######

**NOTE**: Not all brushes work correctly (brushlib.js does not support the functions of the latest version of mypaint), use the settings to adjust!

**NOTE**: All brushes needs converts, using [my converter](https://github.com/AlekPet/brushlib.js))

## Convert information:

All avaiables convertered brushes written indise in the file **brushes_data.json**

### Use brushConverter.py:

**run_converter_python.cmd**

##### Convert brushes (python)

```bash
python brushConverter.py convert
```

##### Generate list brushes (python)

```bash
python brushConverter.py brushes
```

### Use brushConverter.js nodejs:

##### Convert brushes (nodejs)

```bash
npm run convert
```

##### Generate list brushes (nodejs)

```bash
npm run brushes
```

### Read more in file txt inside folder packs_brushes

# Piping

### Implemented the ability to connect an image to the PainterNode input, thereby creating piping in image.

#### There are options to configure piping (button Settings):

- Add as background
- Add as image
  - Size adjustment
  - Send to back canvas

### There are also options:

- Change size (change the canvas size in accordance with piping in image at the input)
- Update image (not update the images of the node with piping in image (**Note:** you must enable this option so that the mask does not change))

![Screenshot Piping](https://github.com/AlekPet/ComfyUI_Custom_Nodes_AlekPet/raw/master/PainterNode/pipingImage.jpg)

# User custom fonts

> To add custom fonts, they must be written in the css file: `PainterNode\css\painter_node_user_fonts.css`

### Two variants:

**Variant 1**: Path to fonts, fonts puts in the `PainterNode\fonts`, adn add to the code in the css.

```css
@font-face {
  font-family: "Pricedown";
  src: url("./../../fonts/painternode/pricedown.otf") format("opentype");
}
```

**Variant 2**: Add url to font in the `painter_node_user_fonts.css`, example used link [google fonts.](https://fonts.google.com/)

```css
@import url("https://fonts.googleapis.com/css2?family=Jacquard+12&display=swap");
```
