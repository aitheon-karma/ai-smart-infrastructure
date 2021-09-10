import { Component, forwardRef, Input, HostListener } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'ai-tree-dropdown',
  templateUrl: './tree-dropdown.component.html',
  styleUrls: ['./tree-dropdown.component.scss'],
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => TreeDropdownComponent),
    multi: true
  }],
})
export class TreeDropdownComponent implements ControlValueAccessor {
  @Input() placeholder: string;
  @Input() separator = '.';
  @Input() error: boolean;
  @Input() disable: boolean;
  @Input() items: {
    label: string,
    _id: string,
    items: any[],
  }[];

  isOpened: boolean;
  dropdownClass = `${Number(new Date()) * Math.random()}`.replace('.', '_');
  activeItem: string;
  displayValue: string;
  groupId: string;

  /** NG CONTROL SECTION */
  value: any;

  onChange: (_: any) => void = (_: any) => {};

  onTouched: () => void = () => {};

  updateChanges() {
    this.onChange(this.value);
  }

  writeValue(value: any): void {
    this.value = value;
    this.setDisplayValue();
    this.updateChanges();
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  /** END OF NG CONTROL SECTION */

  @HostListener('document:click', ['$event'])
  onClick(event: any) {
    if (this.disable) {
      return;
    }
    const isClassInPath = (path, className) => path.find(el => {
      return el.classList && el.classList.contains(className);
    });
    const isDropdownClicked = isClassInPath(event.path, this.dropdownClass);
    if (isDropdownClicked && isClassInPath(event.path, 'tree-dropdown__dropdown-item')) {
      return;
    }
    if (isDropdownClicked) {
      this.toggle();
    } else {
      this.activeItem = null;
      this.groupId = null;
      this.isOpened = false;
    }
  }

  toggle() {
    if (this.disable) {
      return;
    }
    this.isOpened = !this.isOpened;
    this.activeItem = null;
  }

  toggleItem(event: Event, item: any) {
    if (item && !this.disable) {
      this.activeItem = item._id === this.activeItem ? null : item._id;
    }
  }

  setDisplayValue() {
    if (this.value && this.items.length) {
      let groupItem;
      const group = this.items.find(({ items }) => {
        const item = items.find(({ _id }) => _id === this.value);
        if (item) {
          groupItem = item;
          return true;
        }
        return false;
      });
      if (groupItem && group) {
        this.groupId = group._id;
        this.displayValue = `${group.label}${this.separator}${groupItem.name}`;
      }
      return;
    }
    this.displayValue = null;
  }

  setValue(event: Event, item: any) {
    this.value = item._id;
    this.updateChanges();
    this.setDisplayValue();
  }

  stopEvent(event: Event) {
    event.stopPropagation();
    event.preventDefault();
  }
}
