import { scaleLinear, ScaleLinear } from 'd3-scale';

import { NOTE_STRINGS } from '../constants';

import { noteFromPitch, colorFromNote, centsOffFromPitch} from '../utils';

interface IFrequency {
  frequency: number;
  clarity: number;
  time: number;
}

interface IMelodyNote {
  start: number;
  duration: number;
  pitch: number;
}

class PitchDisplay {
  scaleX: ScaleLinear<number, number>;
  scaleY: ScaleLinear<number, number>;
  now: number; // Time at the last call to render()
  container: HTMLElement;
  bgCanvas: HTMLCanvasElement;
  melodyCanvas: HTMLCanvasElement;
  noteCanvas: HTMLCanvasElement;
  bgContext: CanvasRenderingContext2D;
  melodyContext: CanvasRenderingContext2D;
  noteContext: CanvasRenderingContext2D;
  timeSpan: number;
  lastSongPos: number;
  songPlaying: boolean;
  songResumed: number;
  frequencies: IFrequency[] = [];
  melodyNotes: IMelodyNote[] = [];
  background: string = '#efefef';
  highlight: string = '#888888';

  constructor(container: HTMLElement, timeSpan: number = 15000) {
    this.container = container;

    this.container.style.position = "relative";
    const canvasStyle = "position: absolute; width: 100%; height: 100%;";
    this.bgCanvas = document.createElement("canvas");
    this.bgCanvas.setAttribute("style", canvasStyle);
    this.bgContext = this.bgCanvas.getContext('2d');

    this.melodyCanvas = document.createElement("canvas");
    this.melodyCanvas.setAttribute("style", canvasStyle);
    this.melodyContext = this.melodyCanvas.getContext('2d');

    this.noteCanvas = document.createElement("canvas");
    this.noteCanvas.setAttribute("style", canvasStyle);
    this.noteContext = this.noteCanvas.getContext('2d');

    this.container.appendChild(this.bgCanvas);
    this.container.appendChild(this.melodyCanvas);
    this.container.appendChild(this.noteCanvas);

    this.timeSpan = timeSpan;

    this.lastSongPos = 0;
    this.songResumed = 0;
    this.songPlaying = false;

    this.resize();
  }

  resize() {
    let w = this.container.clientWidth;
    let h = this.container.clientHeight;

    this.bgCanvas.width = w;
    this.bgCanvas.height = h;
    this.melodyCanvas.width = w;
    this.melodyCanvas.height = h;
    this.noteCanvas.width = w;
    this.noteCanvas.height = h;

    this.scaleX = scaleLinear()
      .domain([-(this.timeSpan / 2), this.timeSpan / 2])
      .range([0, w]);

    let margin = h / (NOTE_STRINGS.length + 1);
    this.scaleY = scaleLinear()
      .domain([0, NOTE_STRINGS.length - 1])
      .range([h - margin, margin]);

    this.render();
  }

  pushFrequency(frequency: IFrequency) {
    this.frequencies.push(frequency);
  }

  cleanupFrequencies() {
    // Throw away the frequencies that are out of the current display window
    this.frequencies = this.frequencies.filter((val) => this.now - val.time < this.timeSpan / 2);
  }

  setMelodyNotes(melodyNotes: IMelodyNote[]) {
    this.melodyNotes = melodyNotes;
  }

  playSong() {
    this.songResumed = (new Date()).getTime();
    this.songPlaying = true;
  }

  pauseSong() {
    // save current song position
    this.lastSongPos = (new Date()).getTime() - this.songResumed;
    this.songPlaying = false;
  }

  render(full: boolean = true) {
    this.now = (new Date()).getTime();
    // calculate song position
    let songPos: number = this.lastSongPos;
    if (this.songPlaying) {
      songPos += this.now - this.songResumed;
    }

    this.cleanupFrequencies();
    if (full) {
      this.drawBackground();
    }
    this.drawMelody(songPos);
    this.drawNotes();
  }

  setBackgroundColor(color: string) {
    this.background = color;
    this.drawBackground();
  }

  setHighlightColor(color: string) {
    this.highlight = color;
    this.drawBackground();
  }

  drawBackground() {
    let w = this.bgCanvas.width;
    let h = this.bgCanvas.height;
    this.bgContext.fillStyle = this.background;
    this.bgContext.clearRect(0, 0, w, h);
    this.bgContext.fillRect(0, 0, w, h);

    for (let i = 0; i < NOTE_STRINGS.length; ++i) {
      let y = this.scaleY(i);
      this.bgContext.fillStyle = this.highlight + '55';
      this.bgContext.fillRect(0, y, w, 1);
      this.bgContext.fillStyle = this.highlight;
      this.bgContext.font = '14px Sans'
      this.bgContext.fillText(NOTE_STRINGS[i], this.scaleX(0) + 20, y - 2);
    }

    this.bgContext.fillStyle = this.highlight + '55';
    this.bgContext.fillRect(this.scaleX(0), 0, 1, h);
  }

  drawNotes() {
    let w = this.noteCanvas.width;
    let h = this.noteCanvas.height;

    this.noteContext.clearRect(0, 0, w, h);
    this.noteContext.beginPath();
    this.noteContext.strokeStyle = 'rgba(0, 0, 0, 0.1)';

    // Calculate notes and colors from frequencies
    const notes = [];
    for (let frequency of this.frequencies) {
      let t: number = frequency.time;
      let f: number = frequency.frequency;
      let c: number = frequency.clarity;
      let note = noteFromPitch(f);
      let centsOff = centsOffFromPitch(f, note);
      let x = this.scaleX(t - this.now);
      let y = this.scaleY(note % 12 + centsOff / 100);
      let color = colorFromNote(note);
      notes.push({
        time: t,
        x,
        y,
        clarity: c,
        color
      })
    }

    // Draw lines
    const timeCutoff = 500;
    this.noteContext.beginPath();
    for (let i = 1; i < notes.length; ++i) {
      const {x, y, time} = notes[i];
      const prevTime = notes[i - 1].time;
      if (time - prevTime > timeCutoff) {
        this.noteContext.stroke();
        this.noteContext.beginPath();
        this.noteContext.moveTo(x, y);
      } else {
        this.noteContext.lineTo(x, y);
      }
    }
    this.noteContext.stroke();

    // Draw circles
    for (let note of notes) {
      const {x, y, clarity, color} = note;
      this.noteContext.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${clarity * 0.5})`;
      this.noteContext.beginPath();
      this.noteContext.arc(x, y, 3, 0, Math.PI * 2);
      this.noteContext.fill();
    }
  }

  drawMelody(songPos: number) {
    let w = this.melodyCanvas.width;
    let h = this.melodyCanvas.height;

    const ctx: CanvasRenderingContext2D = this.melodyContext;
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(0, 255, 0, 1)';
    ctx.lineWidth = h / 24;
    for (let note of this.melodyNotes) {
      const { start, duration, pitch } = note;
      const startX = this.scaleX(start - songPos);
      const endX = this.scaleX(start - songPos + duration);
      const y = this.scaleY(pitch % 12);
      ctx.beginPath();
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
      ctx.stroke();
    }
  }
}

export { PitchDisplay }
