import React, { Component } from 'react';
import qs from 'qs';

import { PitchDisplay } from 'pitch-display';

import { BACKGROUND } from '../../constants/colors';
import { decodeS1 } from '../../services/s1Encoding';

export interface PitchProps {
  freq: number | null;
  clarity: number | null;
}

function FastForwardButton({ onPress, onRelease, style }) {
  return (
    <div style={style} onMouseDown={onPress} onMouseUp={onRelease}>
      FAST FORWARD
    </div>
  );
}

function PauseButton({ onPress, onRelease, style }) {
  return (
    <div style={style} onMouseDown={onPress} onMouseUp={onRelease}>
      PAUSE
    </div>
  );
}

class PitchComponent extends Component<PitchProps> {
  displayElement = React.createRef<HTMLDivElement>();
  pitchDisplay?: PitchDisplay;
  lastRender: number = 0;
  continuousUpdate: boolean = true;
  notes: [];

  componentDidMount() {
    this.readNotes();

    this.pitchDisplay = new PitchDisplay(
      this.displayElement.current!,
      6000
    );
    this.pitchDisplay.setBackgroundColor(BACKGROUND);
    this.pitchDisplay.setMelodyNotes(this.notes);
    this.pitchDisplay.playSong();

    // We want to ensure `pitchDisplay` updates at regular
    // time intervals even if the note has not changed (so
    // that the display continues scrolling)
    const startRender = () => {
      this.updatePitch();
      if (this.continuousUpdate) {
        requestAnimationFrame(startRender);
      }
    };
    startRender();
    window.addEventListener('resize', this.onResize);
  }

  componentWillUnmount() {
    this.continuousUpdate = false;
    window.removeEventListener('resize', this.onResize);
  }

  readNotes() {
    // decode notes from query parameter
    this.notes = [];
    const params = qs.parse(window.location.search.substr(1));
    if (params.s1) {
      try {
        this.notes = decodeS1(params.s1);
      } catch (error) {
        alert(error.toString());
      }
    }
  }

  onResize = () => {
    if (this.pitchDisplay) {
      this.pitchDisplay.resize();
    }
  };

  updatePitch() {
    const time = new Date().getTime();
    if (time - this.lastRender < 17) {
      // We don't want to render faster than 60fps
      return;
    }
    if (!this.pitchDisplay) {
      return;
    }
    const { freq, clarity } = this.props;
    if (freq && freq > 0) {
      this.pitchDisplay.pushFrequency({
        frequency: freq,
        clarity: clarity || 0,
        time,
      });
    }
    this.lastRender = time;
    this.pitchDisplay.render(false);
  }

  render() {
    this.updatePitch();
    const fastForwardStyle = {
      position: 'absolute',
      bottom: 40,
      right: 40,
    };
    const pauseStyle = {
      position: 'absolute',
      bottom: 40,
      left: 80,
    };
    return (
      <React.Fragment>
        <div
          className="full"
          style={{ position: 'relative' }}
          ref={this.displayElement}
        />
        <PauseButton
          onPress={() => this.pitchDisplay.pauseSong()}
          onRelease={() => this.pitchDisplay.playSong()}
          style={pauseStyle}
        />
        <FastForwardButton
          onPress={() => this.pitchDisplay.fastForwardSong()}
          onRelease={() => this.pitchDisplay.playSong()}
          style={fastForwardStyle}
        />
      </React.Fragment>
    );
  }
}

export default PitchComponent;
