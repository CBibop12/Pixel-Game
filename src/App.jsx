import { useState, useEffect } from 'react';
import './App.css';
import floorTile from './assets/icons/floorTile';
import soundButton from './assets/icons/soundButton';
import soundButtonHover from './assets/icons/soundButtonHover';
import AudioPlayer from './assets/audioPlayer';
import warriors from './assets/audio/warriors.mp3'
import minotaur from './assets/characters/minotaur';
import yuanTi from './assets/characters/yuanTi';
import maps from './assets/icons/maps'
import font from './assets/icons/font'

let objectsOnMap = []

function Pixel({ id, handleMouseOver, handleClick }) {
  return <div className="pixel" id={id} onMouseOver={() => handleMouseOver(id)} onClick={() => handleClick(id)}></div>;
}

function Row({ rowIndex, handleMouseOver, handleClick }) {
  const pixels = [];
  for (let j = 1; j <= 741; j++) {
    const id = `${rowIndex}-${j}`;
    pixels.push(<Pixel key={id} id={id} handleMouseOver={handleMouseOver} handleClick={handleClick} />);
  }
  return <div className="row">{pixels}</div>;
}
function App() {
  const [rows, setRows] = useState([]);
  const [isScreenLoaded, screenIsLoaded] = useState(false);
  const [interactedObject, setInteractedObject] = useState('');
  const [hoveredObject, setHoveredObject] = useState('');
  const [teams, setTeams] = useState([[], []])
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  function loadScreen() {
    const rowsArray = [];
    for (let i = 1; i <= 537; i++) {
      rowsArray.push(<Row key={i} rowIndex={i} handleMouseOver={handleMouseOver}  handleClick={handleClick}/>);
    }
    setRows(rowsArray);
  }

  const scanBackground = (position, height, width) => {
    let currentY = position[0];
    let currentX = position[1];
    let background = [];
    for (let i = 0; i < height; i++) {
      let row = [];
      for (let j = 0; j < width; j++) {
        const colouredPixel = document.getElementById(`${currentY}-${currentX}`);
        if (colouredPixel) {
          const currentColor = window.getComputedStyle(colouredPixel).backgroundColor;
          const rgba = currentColor.match(/\d+/g).map(Number);
          rgba.push(100);
          row.push(rgba);
        } else {
          row.push([0, 0, 0, 0]);
        }
        currentX++;
      }
      background.push(row);
      currentX = position[1];
      currentY++;
    }
    return background;
  };

  function drawElement(pixelArray, position, isCentered, isAligned, absoluteXPosition, absoluteYPosition) {
    if (pixelArray.length) {
      const objWidth = pixelArray[0].length;
      const objHeight = pixelArray.length;
      let [firstPixelHeight, firstPixelWidth] = position;
      let firstPixel = [];

      firstPixel.push(isAligned ? firstPixelHeight - Math.ceil(objHeight / 2) < 1 ? 1 : firstPixelHeight - Math.ceil(objHeight / 2) : firstPixelHeight);
      firstPixel.push(isCentered ? firstPixelWidth - Math.ceil(objWidth / 2) < 1 ? 1 : firstPixelWidth - Math.ceil(objWidth / 2) : firstPixelWidth);

      if (!absoluteXPosition && !absoluteYPosition) {
        let currentY = firstPixel[0];

        for (let y = 0; y < pixelArray.length; y++) {
          let currentX = firstPixel[1];
          for (let x = 0; x < pixelArray[y].length; x++) {
            const [r, g, b, a] = pixelArray[y][x];
            const colouredPixel = document.getElementById(`${currentY}-${currentX}`);

            if (colouredPixel && a !== 0) {
              colouredPixel.style.backgroundColor = `rgba(${r}, ${g}, ${b}, ${a / 100})`;
            }

            currentX++;
          }
          currentY++;
        }
      }
    }
  }

  function cleanElement(name) {
    let objInd = objectsOnMap.findIndex(el => el.objName == name);
    if (objInd != -1) {
      let obj = objectsOnMap[objInd];
      let firstPixel = obj.position;
      let pixelArray = obj.background;
      let currentY = firstPixel[0];
      for (let y = 0; y < pixelArray.length; y++) {
        let currentX = firstPixel[1];
        for (let x = 0; x < pixelArray[y].length; x++) {
          const [r, g, b, a] = pixelArray[y][x];
          const colouredPixel = document.getElementById(`${currentY}-${currentX}`);

          if (colouredPixel) {
            colouredPixel.style.backgroundColor = `rgba(${r}, ${g}, ${b}, ${a / 100})`;
          }

          currentX++;
        }
        currentY++;
      }
    }
  }

  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  
  function analyzeIntersectionFor(target) {
    let targetBorders;
    
    if (typeof target === 'string') {
      let objInd = objectsOnMap.findIndex(el => el.objName === target);
      if (objInd !== -1) {
        targetBorders = [
          objectsOnMap[objInd].hitbox[0], // Верхняя граница
          objectsOnMap[objInd].hitbox[1], // Правая граница
          objectsOnMap[objInd].hitbox[2], // Нижняя граница
          objectsOnMap[objInd].hitbox[3]  // Левая граница
        ];
        console.log("Target borders of searching for intersection are: ", targetBorders);
      }
    } else if (Array.isArray(target) && target.length === 4) {
      targetBorders = target;
    }
  
    if (targetBorders) {
      let intersectedObj = [];
      
      for (let obj of objectsOnMap) {
        let objBorders = [
          obj.hitbox[0], // Верхняя граница
          obj.hitbox[1], // Правая граница
          obj.hitbox[2], // Нижняя граница
          obj.hitbox[3]  // Левая граница
        ];
  
        // Условие пересечения
        if (!(targetBorders[1] < objBorders[3] || // Правая граница target меньше левой границы obj
              targetBorders[3] > objBorders[1] || // Левая граница target больше правой границы obj
              targetBorders[2] < objBorders[0] || // Нижняя граница target выше верхней границы obj
              targetBorders[0] > objBorders[2])) { // Верхняя граница target ниже нижней границы obj
          intersectedObj.push(obj);
        }
      }
      
      return intersectedObj;
    }
    return [];
  }


  async function moveObject(name, move) {
    let objInd = objectsOnMap.findIndex(el => el.objName === name);
    if (objInd !== -1) {
      let obj = objectsOnMap[objInd];
      const objWidth = obj.object.defaultIcon[0].length;
      const objHeight = obj.object.defaultIcon.length;
      let position = [...obj.position];

        const initIntersected = analyzeIntersectionFor(name)
          .filter(item => item.layer > obj.layer && item !== obj)
          .sort((a, b) => b.layer - a.layer);
          console.log("Looking intersections for:", name);
        if (initIntersected.length > 1) {
          console.log(initIntersected);
        }
        
        // Очищаем пересекаемые объекты
        for (let el of initIntersected) {
          cleanElement(el.objName);
        }

        // Очищаем сам объект
        cleanElement(obj.objName);

        // Обновляем позицию объекта
        position[0] += move[0]
        position[1] += move[1]

        let hitbox = [[...position], [position[0], position[1] + objWidth], [position[0] + objHeight, position[1]], [position[0] + objHeight, position[1] + objWidth]];
        obj.hitbox = hitbox
        // Проверяем новые пересечения на новой позиции
        const newIntersected = analyzeIntersectionFor(hitbox)
          .filter(item => item.layer > obj.layer && item !== obj)
          .sort((a, b) => b.layer - a.layer);

        for (let el of newIntersected) {
          if (!initIntersected.includes(el)) {
            cleanElement(el.objName);
            initIntersected.push(el);
          }
        }

        // Записываем задний фон и рисуем объект
        obj.background = scanBackground(position, objHeight, objWidth);
        drawElement(obj.object.defaultIcon, position, false, false, false, false);

        // Рисуем пересекаемые объектыas
        for (let el of initIntersected.sort((a, b) => a.layer - b.layer)) {
          el.background = scanBackground(el.position, el.object.defaultIcon.length, el.object.defaultIcon[0].length);
          drawElement(el.object.defaultIcon, el.position, false, false, false, false);
        }


      obj.position = position
    }
  }


  function drawRectangle(width, height, position, color) {
    for (let y = position[0]; y <= position[0] + height; y++) {
      for (let x = position[1]; x <= position[1] + width; x++) {
        const colouredPixel = document.getElementById(`${y}-${x}`);
        if (colouredPixel) {
          colouredPixel.style.backgroundColor = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${color[3] / 100})`;
        }
      }
    }
  }


  function createObject(position, layer, type, affiliation, objectInfo) {
    const objWidth = objectInfo.defaultIcon[0].length;
    const objHeight = objectInfo.defaultIcon.length;
    let background = scanBackground(position, objHeight, objWidth);

    const newObject = {
      object: objectInfo,
      objName: objectInfo.name,
      position: position,
      hitbox: [
        [position[0], position[1]],
        [position[0], position[1] + objectInfo.defaultIcon[0].length - 1],
        [position[0] + objectInfo.defaultIcon.length - 1, position[1]],
        [position[0] + objectInfo.defaultIcon.length - 1, position[1] + objectInfo.defaultIcon[0].length - 1]
      ],
      background: background,
      layer: layer,
      type: type,
      affiliation: affiliation
    };
    objectsOnMap.push(newObject);
    console.log(objectsOnMap);
    drawElement(objectInfo.defaultIcon, position, false, false, false, false);
  }

  function buildObject(elementArr) {
    let finalArr = [];
    let finalWidth = 0;
    let finalHeight = 0;

    // Определяем размеры конечного массива
    for (let i of elementArr) {
      if (i.type == "rectangle") {
        if (i.position[1] + i.width > finalWidth) {
          finalWidth = i.position[1] + i.width;
        }
        if (i.position[0] + i.height > finalHeight) {
          finalHeight = i.position[0] + i.height;
        }
      } else {
        if (i.position[1] + i.pixelArray[0].length > finalWidth) {
          finalWidth = i.position[1] + i.pixelArray[0].length;
        }
        if (i.position[0] + i.pixelArray.length > finalHeight) {
          finalHeight = i.position[0] + i.pixelArray.length;
        }
      }
    }

    // Создаем пустой массив нужного размера
    for (let y = 0; y < finalHeight; y++) {
      let row = [];
      for (let x = 0; x < finalWidth; x++) {
        row.push([0, 0, 0, 0]);
      }
      finalArr.push(row);
    }

    // Заполняем массив элементами
    for (let el of elementArr) {
      let startX = el.position[1];
      let startY = el.position[0];
      if (el.type == "rectangle") {
        for (let y = startY; y < startY + el.height; y++) {
          for (let x = startX; x < startX + el.width; x++) {
            finalArr[y][x] = [el.color[0], el.color[1], el.color[2], el.color[3]];
          }
        }
      } else {
        for (let y = 0; y < el.pixelArray.length; y++) {
          for (let x = 0; x < el.pixelArray[y].length; x++) {
            finalArr[startY + y][startX + x] = [...el.pixelArray[y][x]];
          }
        }
      }
    }

    return finalArr;
  }

  function movingPlan(totalSteps, totalSlides) {
    let stepsCoef = totalSteps / totalSlides
    let stepsCount = 1
    let slideCoeffCount = 0
    let slidesAmountCount = 0
    let plan = [1]
    while (stepsCount < totalSteps || slidesAmountCount < totalSlides) {
      isStepDone = stepsCount == totalSteps
      isSlideDone = slidesAmountCount == totalSlides
      if (isStepDone || isSlideDone) {
        if (isStepDone) {
          plan.push(0)
          slidesAmountCount++
        }
        else {
          plan.push(1)
          stepsCount++
        }
      }
      else {
        if (stepsCount > slideCoeffCount) {
          plan.push(0)
          slideCoeffCount += stepsCoef
          slidesAmountCount++
        }
        else if (stepsCount < slideCoeffCount) {
          plan.push(1)
          stepsCount++
        }
      }
    }
    return plan
  }

  function advanceMovingSetting(movingSettings, direction) {
    let advancedArr = []
    for (let el of movingSettings) {
      let [y, x] = el.split("&").map(Number);
      let moveObject = [y, x]
      if (direction == "up") {
        moveObject = [x * -1, y]
      }
      else if (direction == "down") {
        moveObject = [x, y]
      }
      else if (direction == "left") {
        moveObject = [-x, y]
      }
      advancedArr.push(moveObject)
    }
    return advancedArr
  }

  async function playAnimation(name, animationName, direction) {
    let objInd = objectsOnMap.findIndex(el => el.objName == name);
    if (objInd != -1) {
        const ch = objectsOnMap[objInd];
        console.log(ch.object)
        const anim = ch.object.animations[animationName];
        if (anim) {
            if (anim.type == "normal") {
                let currentBg = ch.background;
                let prevHitbox = ch.hitbox;
                let lastPositioning = "leftUp"
                for (let slide of anim.slides) {
                    const slideWidth = slide.pixelArr[0].length;
                    const slideHeight = slide.pixelArr.length;
                    drawElement(currentBg, prevHitbox[0], false, false, false, false);
                    if (slide.positioning == "leftUp") {
                        // Анимация рисуется от левой верхней точки
                        prevHitbox = [
                            [prevHitbox[0][0], prevHitbox[0][1]], 
                            [prevHitbox[0][0], prevHitbox[0][1] + slideWidth], 
                            [prevHitbox[0][0] + slideHeight, prevHitbox[0][1]], 
                            [prevHitbox[0][0] + slideHeight, prevHitbox[0][1] + slideWidth]
                        ];
                        currentBg = scanBackground(prevHitbox[0], slideHeight, slideWidth);
                        drawElement(slide.pixelArr, prevHitbox[0], false, false, false, false);
                      } else if (slide.positioning == "rightUp") {
                        // Анимация рисуется от правой верхней точки
                        prevHitbox = [
                            [prevHitbox[1][0], prevHitbox[1][1] - slideWidth], 
                            [prevHitbox[1][0], prevHitbox[1][1]],
                            [prevHitbox[1][0] + slideHeight, prevHitbox[1][1] - slideWidth], 
                            [prevHitbox[1][0] + slideHeight, prevHitbox[1][1]]
                        ];
                        currentBg = scanBackground([prevHitbox[1][0], prevHitbox[1][1] - slideWidth], slideHeight, slideWidth);
                        drawElement(slide.pixelArr, [prevHitbox[1][0], prevHitbox[1][1] - slideWidth], false, false, false, false);
                    } else if (slide.positioning == "leftDown") {
                        // Анимация рисуется от левой нижней точки
                        prevHitbox = [
                            [prevHitbox[2][0] - slideHeight, prevHitbox[2][1]], 
                            [prevHitbox[2][0] - slideHeight, prevHitbox[2][1] + slideWidth],
                            [prevHitbox[2][0], prevHitbox[2][1]], 
                            [prevHitbox[2][0], prevHitbox[2][1] + slideWidth]
                        ];
                        currentBg = scanBackground([prevHitbox[2][0] - slideHeight, prevHitbox[2][1]], slideHeight, slideWidth);
                        drawElement(slide.pixelArr, [prevHitbox[2][0] - slideHeight, prevHitbox[2][1]], false, false, false, false);
                    } else if (slide.positioning == "rightDown") {
                        // Анимация рисуется от правой нижней точки
                        prevHitbox = [
                            [prevHitbox[3][0] - slideHeight, prevHitbox[3][1] - slideWidth], 
                            [prevHitbox[3][0] - slideHeight, prevHitbox[3][1]],
                            [prevHitbox[3][0], prevHitbox[3][1] - slideWidth], 
                            [prevHitbox[3][0], prevHitbox[3][1]]
                        ];
                        currentBg = scanBackground([prevHitbox[3][0] - slideHeight, prevHitbox[3][1] - slideWidth], slideHeight, slideWidth);
                        drawElement(slide.pixelArr, [prevHitbox[3][0] - slideHeight, prevHitbox[3][1] - slideWidth], false, false, false, false);
                    }
                    lastPositioning = slide.positioning
                    await delay(slide.duration)
                }
                drawElement(currentBg, prevHitbox[0], false, false, false, false);
                let origWidth = objectsOnMap[objInd].object.defaultIcon[0].length;
                let origHeight = objectsOnMap[objInd].object.defaultIcon.length;

                if (lastPositioning == "leftUp") {
                  let newHitbox = [
                    [prevHitbox[0][0], prevHitbox[0][1]], 
                    [prevHitbox[0][0], prevHitbox[0][1] + origWidth], 
                    [prevHitbox[0][0] + origHeight, prevHitbox[0][1]], 
                    [prevHitbox[0][0] + origHeight, prevHitbox[0][1] + origWidth]
                  ];
                  let newBg = scanBackground(newHitbox[0], origHeight, origWidth);
                  drawElement(ch.object.defaultIcon, newHitbox[0], false, false, false, false);
                  ch.background = newBg;
                  ch.hitbox = newHitbox
                } else if (lastPositioning == "rightUp") {
                  let newHitbox = [
                    [prevHitbox[1][0], prevHitbox[1][1] - origWidth],
                    [prevHitbox[1][0], prevHitbox[1][1]],
                    [prevHitbox[1][0] + origHeight, prevHitbox[1][1] - origWidth],
                    [prevHitbox[1][0] + origHeight, prevHitbox[1][1]]
                  ];
                  let newBg = scanBackground(newHitbox[0], origHeight, origWidth);
                  drawElement(ch.object.defaultIcon, newHitbox[0], false, false, false, false);
                  ch.background = newBg;
                  ch.hitbox = newHitbox
                } else if (lastPositioning == "leftDown") {
                  let newHitbox = [
                    [prevHitbox[2][0] - origHeight, prevHitbox[2][1]], 
                    [prevHitbox[2][0] - origHeight, prevHitbox[2][1] + origWidth], 
                    [prevHitbox[2][0], prevHitbox[2][1]], 
                    [prevHitbox[2][0], prevHitbox[2][1] + origWidth]
                  ];
                  let newBg = scanBackground(newHitbox[0], origHeight, origWidth);
                  drawElement(ch.object.defaultIcon, newHitbox[0], false, false, false, false);
                  ch.background = newBg;
                  ch.hitbox = newHitbox
                } else if (lastPositioning == "rightDown") {
                  let newHitbox = [
                    [prevHitbox[3][0] - origHeight, prevHitbox[3][1] - origWidth],
                    [prevHitbox[3][0] - origHeight, prevHitbox[3][1]],
                    [prevHitbox[3][0], prevHitbox[3][1] - origWidth],
                    [prevHitbox[3][0], prevHitbox[3][1]]
                  ];
                  let newBg = scanBackground(newHitbox[0], origHeight, origWidth);
                  drawElement(ch.object.defaultIcon, newHitbox[0], false, false, false, false);
                  ch.background = newBg;
                  ch.hitbox = newHitbox
                }
            }
            else if (anim.type == "moving") {
              let plan = movingPlan(anim.movingSettings.length, anim.slides.length)
              let advancedMoving 
              let currentBg = ch.background;
              let prevHitbox = ch.hitbox;
              let lastPositioning = "leftUp"


                  lastPositioning = slide.positioning
                  await delay(slide.duration)
              drawElement(currentBg, prevHitbox[0], false, false, false, false);
              let origWidth = objectsOnMap[objInd].object.defaultIcon[0].length;
              let origHeight = objectsOnMap[objInd].object.defaultIcon.length;

              if (lastPositioning == "leftUp") {
                let newHitbox = [
                  [prevHitbox[0][0], prevHitbox[0][1]], 
                  [prevHitbox[0][0], prevHitbox[0][1] + origWidth], 
                  [prevHitbox[0][0] + origHeight, prevHitbox[0][1]], 
                  [prevHitbox[0][0] + origHeight, prevHitbox[0][1] + origWidth]
                ];
                let newBg = scanBackground(newHitbox[0], origHeight, origWidth);
                drawElement(ch.object.defaultIcon, newHitbox[0], false, false, false, false);
                ch.background = newBg;
                ch.hitbox = newHitbox
              } else if (lastPositioning == "rightUp") {
                let newHitbox = [
                  [prevHitbox[1][0], prevHitbox[1][1] - origWidth],
                  [prevHitbox[1][0], prevHitbox[1][1]],
                  [prevHitbox[1][0] + origHeight, prevHitbox[1][1] - origWidth],
                  [prevHitbox[1][0] + origHeight, prevHitbox[1][1]]
                ];
                let newBg = scanBackground(newHitbox[0], origHeight, origWidth);
                drawElement(ch.object.defaultIcon, newHitbox[0], false, false, false, false);
                ch.background = newBg;
                ch.hitbox = newHitbox
              } else if (lastPositioning == "leftDown") {
                let newHitbox = [
                  [prevHitbox[2][0] - origHeight, prevHitbox[2][1]], 
                  [prevHitbox[2][0] - origHeight, prevHitbox[2][1] + origWidth], 
                  [prevHitbox[2][0], prevHitbox[2][1]], 
                  [prevHitbox[2][0], prevHitbox[2][1] + origWidth]
                ];
                let newBg = scanBackground(newHitbox[0], origHeight, origWidth);
                drawElement(ch.object.defaultIcon, newHitbox[0], false, false, false, false);
                ch.background = newBg;
                ch.hitbox = newHitbox
              } else if (lastPositioning == "rightDown") {
                let newHitbox = [
                  [prevHitbox[3][0] - origHeight, prevHitbox[3][1] - origWidth],
                  [prevHitbox[3][0] - origHeight, prevHitbox[3][1]],
                  [prevHitbox[3][0], prevHitbox[3][1] - origWidth],
                  [prevHitbox[3][0], prevHitbox[3][1]]
                ];
                let newBg = scanBackground(newHitbox[0], origHeight, origWidth);
                drawElement(ch.object.defaultIcon, newHitbox[0], false, false, false, false);
                ch.background = newBg;
                ch.hitbox = newHitbox
              }
          }
        }
    }
}

 function changeSprite(name, pixelArr, positioning) {
  let objInd = objectsOnMap.findIndex(el => el.objName == name);
  const objWidth = pixelArr[0].length - 1;
  const objHeight = pixelArr.length - 1;
  if (objInd != -1) { 
    let obj =  objectsOnMap[objInd]
    let currentBg = obj.background;
    let tempHitbox = obj.hitbox
    drawElement(currentBg, obj.position, false, false, false, false)
    if (pixelArr != "default") {
    if (positioning == "leftUp") {
      // Анимация рисуется от левой верхней точки
      tempHitbox = [
          [tempHitbox[0][0], tempHitbox[0][1]], 
          [tempHitbox[0][0], tempHitbox[0][1] + objWidth], 
          [tempHitbox[0][0] + objHeight, tempHitbox[0][1]], 
          [tempHitbox[0][0] + objHeight, tempHitbox[0][1] + objWidth]
      ];
      currentBg = scanBackground(tempHitbox[0], objHeight, objWidth);
      drawElement(pixelArr, tempHitbox[0], false, false, false, false);
    } else if (positioning == "rightUp") {
      // Анимация рисуется от правой верхней точки
      tempHitbox = [
          [tempHitbox[1][0], tempHitbox[1][1] - objWidth], 
          [tempHitbox[1][0], tempHitbox[1][1]],
          [tempHitbox[1][0] + objHeight, tempHitbox[1][1] - objWidth], 
          [tempHitbox[1][0] + objHeight, tempHitbox[1][1]]
      ];
      currentBg = scanBackground([tempHitbox[1][0], tempHitbox[1][1] - objWidth], objHeight, objWidth);
      drawElement(pixelArr, [tempHitbox[1][0], tempHitbox[1][1] - objWidth], false, false, false, false);
  } else if (positioning == "leftDown") {
      // Анимация рисуется от левой нижней точки
      tempHitbox = [
          [tempHitbox[2][0] - objHeight, tempHitbox[2][1]], 
          [tempHitbox[2][0] - objHeight, tempHitbox[2][1] + objWidth],
          [tempHitbox[2][0], tempHitbox[2][1]], 
          [tempHitbox[2][0], tempHitbox[2][1] + objWidth]
      ];
      currentBg = scanBackground([tempHitbox[2][0] - objHeight, tempHitbox[2][1]], objHeight, objWidth);
      drawElement(pixelArr, [tempHitbox[2][0] - objHeight, tempHitbox[2][1]], false, false, false, false);
  } else if (positioning == "rightDown") {
      // Анимация рисуется от правой нижней точки
      tempHitbox = [
          [tempHitbox[3][0] - objHeight, tempHitbox[3][1] - objWidth], 
          [tempHitbox[3][0] - objHeight, tempHitbox[3][1]],
          [tempHitbox[3][0], tempHitbox[3][1] - objWidth], 
          [tempHitbox[3][0], tempHitbox[3][1]]
      ];
      currentBg = scanBackground([tempHitbox[3][0] - objHeight, tempHitbox[3][1] - objWidth], objHeight, objWidth);
      drawElement(pixelArr, [tempHitbox[3][0] - objHeight, tempHitbox[3][1] - objWidth], false, false, false, false);
  }
  objectsOnMap[objInd].background = currentBg
  objectsOnMap[objInd].hitbox = tempHitbox
    }
    else {
      let initWidth = obj.object.defaultIcon[0].length - 1;
      let initHeight = obj.object.defaultIcon.length - 1;
      if (positioning == "leftUp") {
        // Анимация рисуется от левой верхней точки
        tempHitbox = [
            [tempHitbox[0][0], tempHitbox[0][1]], 
            [tempHitbox[0][0], tempHitbox[0][1] + initWidth], 
            [tempHitbox[0][0] + initHeight, tempHitbox[0][1]], 
            [tempHitbox[0][0] + initHeight, tempHitbox[0][1] + initWidth]
        ];
        currentBg = scanBackground(tempHitbox[0], initHeight, initWidth);
        drawElement(obj.object.defaultIcon, tempHitbox[0], false, false, false, false);
      } else if (positioning == "rightUp") {
        // Анимация рисуется от правой верхней точки
        tempHitbox = [
            [tempHitbox[1][0], tempHitbox[1][1] - initWidth], 
            [tempHitbox[1][0], tempHitbox[1][1]],
            [tempHitbox[1][0] + initHeight, tempHitbox[1][1] - initWidth], 
            [tempHitbox[1][0] + initHeight, tempHitbox[1][1]]
        ];
        currentBg = scanBackground([tempHitbox[1][0], tempHitbox[1][1] - initWidth], initHeight, initWidth);
        drawElement(obj.object.defaultIcon, [tempHitbox[1][0], tempHitbox[1][1] - initWidth], false, false, false, false);
    } else if (positioning == "leftDown") {
        // Анимация рисуется от левой нижней точки
        tempHitbox = [
            [tempHitbox[2][0] - initHeight, tempHitbox[2][1]], 
            [tempHitbox[2][0] - initHeight, tempHitbox[2][1] + initWidth],
            [tempHitbox[2][0], tempHitbox[2][1]], 
            [tempHitbox[2][0], tempHitbox[2][1] + initWidth]
        ];
        currentBg = scanBackground([tempHitbox[2][0] - initHeight, tempHitbox[2][1]], initHeight, initWidth);
        drawElement(obj.object.defaultIcon, [tempHitbox[2][0] - initHeight, tempHitbox[2][1]], false, false, false, false);
    } else if (positioning == "rightDown") {
        // Анимация рисуется от правой нижней точки
        tempHitbox = [
            [tempHitbox[3][0] - initHeight, tempHitbox[3][1] - initWidth], 
            [tempHitbox[3][0] - initHeight, tempHitbox[3][1]],
            [tempHitbox[3][0], tempHitbox[3][1] - initWidth], 
            [tempHitbox[3][0], tempHitbox[3][1]]
        ];
        currentBg = scanBackground([tempHitbox[3][0] - initHeight, tempHitbox[3][1] - initWidth], initHeight, initWidth);
        drawElement(obj.object.defaultIcon, [tempHitbox[3][0] - initHeight, tempHitbox[3][1] - initWidth], false, false, false, false);
    }
    objectsOnMap[objInd].background = currentBg
    objectsOnMap[objInd].hitbox = tempHitbox
    }
  }
 }

function changeLayer(name, exactLayer, layerDifference) {
  let objInd = objectsOnMap.findIndex(el => el.objName == name);
  if (objInd != -1) {
    if (exactLayer != 0) {
      objectsOnMap[objInd].layer = exactLayer
    }
    else {
      objectsOnMap[objInd].layer += layerDifference
    }
  }
} 

function buildText (input, color, letterMode, numberMode, maxWidth) {
  let textLimit = maxWidth < 1 ? 741 : maxWidth
  let text = letterMode == "allCapital" ? input.toUpperCase() : letterMode == "allSmall" ? input.toLowerCase() : input
  let lines = [[]] //Array with charData divided by lines
  let textObj = [] //Final object
  let maxHeightOnLine = 0 // The height of the longest letter on the line
  let currentHeight = 0 // The height for painting process
  let objWidth = 0 // The width of expected textObject
  let lineWidth = 0
  let startingPoint = [0, 0]
  for (let char of text) {
    let charData = null;
    const isLetter = char.toLowerCase() !== char.toUpperCase();
    const isNumber = !isNaN(char) && char !== ' ';

    if (isLetter) {
      if (char === char.toUpperCase()) {
        charData = font.capital[char];
      } else {
        charData = font.small[char];
      }
    } else if (isNumber) { // Correct check for numbers
      charData = numberMode === "small" ? font.small[char] : font.capital[char];
    } else {
      if (font.symbols[char]) {
        charData = font.symbols[char];
      }
    }

    if (!charData) continue; // Skip if charData is undefined

    if (lineWidth + charData[0].length > textLimit) {
      lines.push([charData]); // Corrected the push statement  
      objWidth = lineWidth > objWidth ? lineWidth : objWidth
      lineWidth = charData[0].length + 1
      maxHeightOnLine = charData.length;
      currentHeight += 4 + maxHeightOnLine;
    } else {
      lines[lines.length - 1].push(charData);
      lineWidth += charData[0].length + 1;
      if (charData.length > maxHeightOnLine) {
        currentHeight = currentHeight == 0 ? charData.length : currentHeight + (charData.length - maxHeightOnLine);
        maxHeightOnLine = charData.length;
      } 
    }
    objWidth = objWidth == 0? lineWidth : objWidth
    console.log(char, " ", charData);
  }

  for (let i = 0; i < currentHeight; i++) {
    let line = []
    for (let j = 0; j < objWidth; j++) {
      line.push([0, 0, 0, 0])
    }
    textObj.push(line)
  }
  console.log("initial array: ", textObj);

  for (let line of lines) {
    for (let char of line) {
      let objWidth = char[0].length
      let objHeight = char.length
      for (let y = 0; y < objHeight; y++) {
        for (let x = 0; x < objWidth; x++) {
          if (char[y][x][3] != 0) {
            textObj[startingPoint[0] + y][startingPoint[1] + x] = color
          }
        }
      }
      startingPoint[1] += objWidth + 1
    }
    startingPoint = [startingPoint[0] + 10, 0]
  }
  console.log({name: input, defaultIcon: textObj});
  return {name: input, defaultIcon: textObj}
}


  function drawMap() {
    drawRectangle(30, 537, [1, 1], [129, 162, 99, 100]); // Левая стенка
    drawRectangle(741, 30, [507, 1], [129, 162, 99, 100]); // Нижняя стенка
    drawRectangle(741, 30, [1, 1], [129, 162, 99, 100]); // Верхняя стенка
    drawRectangle(30, 537, [31, 711], [129, 162, 99, 100]); // Правая стенка

    drawRectangle(680, 1, [31, 31], [91, 67, 35, 100]); // Верхняя граница поля
    drawRectangle(1, 476, [31, 31], [91, 67, 35, 100]); // Левая граница поля

    let verticalTileCounter = 0;
    let horizontalTileCounter = 0;
    let currentY = 32;
    let currentX = 32;
    while (verticalTileCounter < 28) {
      while (horizontalTileCounter < 40) {
        drawElement(floorTile, [currentY, currentX], false, false, false, false, false);
        currentX += 17;
        horizontalTileCounter++;
      }
      horizontalTileCounter = 0;
      verticalTileCounter++;
      currentX = 32;
      currentY += 17;
    }
  }

  function handleMovement(event) {
    switch (event.key) {
      case 'ArrowLeft':
          moveObject("Minotaur", "0&-17");
        break;
      case 'ArrowUp':
          moveObject("Minotaur", "-17&0");
          changeLayer("Minotaur", 0, -1)
        break;
      case 'ArrowDown':      
          moveObject("Minotaur", "17&0");
          changeLayer("Minotaur", 0, 1)
        break;
      case 'ArrowRight':
          moveObject("Minotaur", "0&17");   
        break;
      case 'p':
        let minotaur = objectsOnMap.find(el => el.objName == "Minotaur");
        let generatedObject = buildObject(
          [
            {
              type: "rectangle",
              position: [1, 2],
              width: 100,
              height: 1,
              color: [255, 255, 255, 100]
            },
            {
              type: "rectangle",
              position: [6, 2],
              width: 100,
              height: 1,
              color: [255, 255, 255, 100]
            },
            {
              type: "rectangle",
              position: [2, 1],
              width: 1,
              height: 4,
              color: [255, 255, 255, 100]
            },
            {
              type: "rectangle",
              position: [2, 102],
              width: 1,
              height: 4,
              color: [255, 255, 255, 100]
            },
            {
              type: "rectangle",
              position: [2, 2],
              width: (minotaur.object.hp / minotaur.object.maxHp) * 100,
              height: 4,
              color: [255, 0, 0, 100]
            },
          ]
        );
        drawElement(generatedObject, [290, 264], false, false, false, false);
        break;
      case 'a':
        playAnimation('Minotaur', 'attack', "")
        break
    }
  }
  function handleMouseOver(id) {
    const [y, x] = id.split('-').map(Number);
    let isHover = false;
    for (let obj of objectsOnMap) {
      if (y >= obj.hitbox[0][0] && y <= obj.hitbox[3][0] && x >= obj.hitbox[0][1] && x <= obj.hitbox[3][1]) {
        isHover = true;
        setHoveredObject(obj.objName);
        break;
      }
    }
    if (!isHover) {
      setHoveredObject('');
    }
  }

  async function handleClick(id) {
    const [y, x] = id.split('-').map(Number);
    let clickedObject = '';
    for (let obj of objectsOnMap) {
      if (y >= obj.hitbox[0][0] && y <= obj.hitbox[3][0] && x >= obj.hitbox[0][1] && x <= obj.hitbox[3][1]) {
        clickedObject = obj.objName;
        break;
      }
    }
    if (clickedObject) {
      setInteractedObject(clickedObject);
      let objInd = objectsOnMap.findIndex(el => el.objName == clickedObject);
      if (objInd != -1) {
        console.log(objectsOnMap[objInd]);
      }
      await delay(100)
      setInteractedObject('')
    } else {
      setInteractedObject('');
    }
  }
  useEffect(() => {
    console.log("You hovered: ", hoveredObject);
    console.log("You clicked on: ", interactedObject);

    if (hoveredObject == "soundButton") {
      changeSprite("soundButton", soundButtonHover, "leftUp")
    }
    else {
      changeSprite("soundButton", "default", "leftUp")
    }
    if (interactedObject == "soundButton") {
      setIsMusicPlaying(!isMusicPlaying);
    }
  }, [interactedObject, hoveredObject])
  useEffect(() => {
    if (!isScreenLoaded) {
      loadScreen();
      screenIsLoaded(true);
    }
  }, [isScreenLoaded]);

 function loadGame(mapName, teamBlue, teamRed) {
  let layers = []
  for (let i = 1; i <= 60; i++) {
    layers.push([])
  }
  for (let el of maps[mapName]) {
    layers[el.cell[0] * 2].push(el)
  }
  for (let el of teamBlue) {
    layers[el.cell[0] * 2].push(el)
  }
  for (let el of teamRed) {
    layers[el.cell[0] * 2].push(el)
  }

  for (let layer of layers) {
    if (layer.length > 0) {
      for (let el of layer) {
        if (el.type != "character") {
          createObject([el.content.buildingType == "wall"? (10 + ((el.cell[0]) * 17)) : (14 + ((el.cell[0]) * 17)), (14 + ((el.cell[1]) * 17))], el.cell[0] * 2, el.type, el.affiliation, {buildingType: el.content.buildingType, name: `${el.content.buildingType}-${el.cell[0]}-${el.cell[1]}`, destroyingType: el.content.destroyingType, hp: el.content.hp, armor: el.content.armor, defaultIcon: el.content.defaultIcon})
        }
        else {
          createObject([(10 + ((el.cell[0]) * 17)), (10 + ((el.cell[1]) * 17))], el.cell[0] * 2, el.type, el.affiliation, el.content)
        }  
      }
    }
  }
 }
// Programm
  useEffect(() => {
    if (isScreenLoaded) {
      drawMap();
      loadGame("pixiesFields",
      [
        {type: "character", affiliation: "blue", content: minotaur, cell: [14, 6]}
      ],
      [
        {type: "character", affiliation: "red", content: yuanTi, cell: [17, 36]}
      ])
      createObject([4, 680], 60, "control", "neutral", soundButton)
      createObject([2, 2], 59, "program text", "neutral", buildText("Hello World!", [0, 0, 0, 100], "default", "big", 20))
      window.addEventListener("keydown", handleMovement);
    }
    return () => {
      window.removeEventListener("keydown", handleMovement);
    };
  }, [isScreenLoaded]);
//---------
  return (
    <div className="blackCover">
      <div className="screen">
        {rows}
        <AudioPlayer src={warriors} play={isMusicPlaying} />
      </div>
    </div>
  );
}
export default App;
