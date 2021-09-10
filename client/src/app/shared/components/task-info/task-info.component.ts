import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'ai-task-info',
  templateUrl: './task-info.component.html',
  styleUrls: ['./task-info.component.scss']
})
export class TaskInfoComponent implements OnInit {
  @Input() device: any;
  @Input() currentFloor: any;
  @Output() close: EventEmitter<boolean> = new EventEmitter<boolean>();

  constructor() { }

  ngOnInit(): void {}

  closeTaskInfo(e: Event) {
    e.preventDefault();
    e.stopPropagation();
    this.close.emit(true);
  }
}
