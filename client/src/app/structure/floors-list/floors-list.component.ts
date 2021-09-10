import { Floor } from '@aitheon/smart-infrastructure';
import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';

import { FormControl } from '@angular/forms';
import { Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'ai-floors-list',
  templateUrl: './floors-list.component.html',
  styleUrls: ['./floors-list.component.scss']
})
export class FloorsListComponent implements OnInit {
  @Input() floors: Floor[];
  @Output() floorSelected: EventEmitter<Floor> = new EventEmitter<Floor>();
  @Input() currentFloor: Floor;
  @Output() hided: EventEmitter<Event> = new EventEmitter<Event>();

  search: FormControl;
  searchSubscription: Subscription;
  filteredFloors: Floor[];

  ngOnInit(): void {
    this.filteredFloors = this.floors.sort((a, b) => a.number - b.number);
    this.search = new FormControl(null);
    this.searchSubscription = this.search.valueChanges.pipe(
      debounceTime(200),
      distinctUntilChanged(),
    ).subscribe(searchText => {
      if (!searchText) {
        this.filteredFloors = this.floors.sort((a, b) => a.number - b.number);
        return;
      }
      this.filteredFloors = this.floors.sort((a, b) => a.number - b.number)
        .filter(({ name, number }) => {
          return name.toLowerCase().includes(searchText.toLowerCase()) ||
            number.toString().includes(searchText[0] === '0' ? searchText.slice(1) : searchText);
        });
    });
  }

  onSelectFloor(event: Event, floor: Floor): void {
    this.floorSelected.emit(floor);
  }

  hideList(event: Event): void {
    this.hided.emit(event);
  }

  public getFormattedFloorNumber(floorNumber: number): string {
    const isNumber = !isNaN(floorNumber);
    const isAbsLessThanTen = Math.abs(floorNumber) < 10;
    const isNegative = floorNumber < 0;
    let formattedFloorNumber = '';

    if (isNumber) {
      formattedFloorNumber = isAbsLessThanTen ? `0${Math.abs(floorNumber)}` : `${Math.abs(floorNumber)}`;
      formattedFloorNumber = isNegative ? `-${formattedFloorNumber}` : `${formattedFloorNumber}`;
    }

    return formattedFloorNumber;
  }
}
