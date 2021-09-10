import { Directive, ElementRef, HostListener, SimpleChanges, OnChanges, Input  } from '@angular/core';

@Directive({
  selector: '[OnlyNumbers]'
})
export class OnlyNumbersDirective {

  @Input() defaultValue: number;

  constructor(private element: ElementRef) { }

  @HostListener('change')
  textChanged() {
    const value = Number(this.element.nativeElement.value);
    if (value < 0) {
      this.element.nativeElement.value = this.defaultValue || 0;
    }
  }

}
