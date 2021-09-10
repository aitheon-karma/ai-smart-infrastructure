import { Component, OnInit } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { AreasService } from '../../services/areas.service';

import { Subscription } from 'rxjs';

@Component({
  selector: 'ai-command-modal',
  templateUrl: './command-modal.component.html',
  styleUrls: ['./command-modal.component.scss']
})
export class CommandModalComponent implements OnInit {
  subscriptions: Subscription[] = [];
  commands: string[];
  show: boolean;
  codeControl: FormControl;
  submitted: boolean;
  position: {
    left: string,
    bottom: string,
  };
  pointId: string;
  areaId: string;
  isEdit: boolean;

  constructor(
    private areasService: AreasService,
  ) {}

  ngOnInit(): void {
    this.codeControl = new FormControl(null, Validators.required);

    this.subscriptions.push(this.areasService.openCommandsModal.subscribe(({ areaId, coordinates, commands, pointId, isEdit }) => {
      this.show = true;
      this.commands = commands;
      this.areaId = areaId;
      this.isEdit = isEdit;
      this.pointId = pointId;
      this.position = {
        left: `${coordinates.x - 140}px`,
        bottom: `${coordinates.y}px`
      };
    }));
  }

  removeCommand(i: number): void {
    this.commands.splice(i, 1);
  }

  saveCommands(): void {
    if (this.isEdit) {
      this.areasService.onRoutePointNcSave(this.commands, this.pointId, this.areaId);
    }
    this.show = false;
  }

  addCommand(): void {
    this.submitted = true;
    if (!this.codeControl.valid) {
      return;
    }

    if (!this.commands) {
      this.commands = [];
    }

    this.commands.push(this.codeControl.value);
    this.codeControl.reset();
    this.submitted = false;
  }

  onClickOutside(): void {
    if (!this.isEdit) {
      this.show = false;
    }
  }
}
