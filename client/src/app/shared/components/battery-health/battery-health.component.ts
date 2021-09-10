import { Component, OnInit, OnChanges, SimpleChanges, AfterViewInit, Input } from '@angular/core';
import * as d3 from 'd3';

enum HealthState {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  FULL = 'FULL',
}

@Component({
  selector: 'ai-battery-health',
  templateUrl: './battery-health.component.html',
  styleUrls: ['./battery-health.component.scss']
})
export class BatteryHealthComponent implements OnInit, OnChanges, AfterViewInit {
  @Input() health: number = 0;
  @Input() reverseView: boolean;
  healthState: HealthState;
  view: any;
  batteryContainer: any;
  batteryLow: any;
  batteryMedium: any;
  batteryFull: any;

  colors = {
    low: '#E96058',
    medium: '#F5BA06',
    full: '#67B231'
  };

  ngOnChanges(changes: SimpleChanges) {
    if (changes.health && this.batteryContainer) {
      this.setHealthState();
      this.setHealth()
    }
  }

  ngOnInit(): void {
    this.setHealthState();
  }

  ngAfterViewInit(): void {
    this.view = d3.select('.battery-health');
    this.batteryContainer = this.view.select('#battery');
    this.batteryLow = this.view.select('#battery-low');
    this.batteryMedium = this.view.select('#battery-medium');
    this.batteryFull = this.view.select('#battery-full');

    this.setHealth();
  }

  private setHealth(): void {
    switch (this.healthState) {
      case HealthState.LOW:
        this.setState(this.colors.low, 1);
        break;
      case HealthState.MEDIUM:
        this.setState(this.colors.medium, 2);
        break;
      case HealthState.FULL:
        this.setState(this.colors.full, 3);
    }
  }

  setHealthState(): void {
    if (this.health <= 33) {
      this.healthState = HealthState.LOW;
      return;
    }
    if (this.health <= 66) {
      this.healthState = HealthState.MEDIUM
      return;
    }
    this.healthState = HealthState.FULL;
  }

  setState(color: string, sections: number): void {
    this.batteryContainer.attr('fill', color);
    this.states.forEach(state => state.attr('fill', 'transparent'));

    new Array(sections).fill(null).forEach((item, i) => {
      this.states[i].attr('fill', color);
    });
  }

  get states(): any[] {
    return [
      this.batteryLow,
      this.batteryMedium,
      this.batteryFull,
    ];
  }
}


