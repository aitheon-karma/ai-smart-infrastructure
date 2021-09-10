
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'prettyEnum' })
export class PrettyEnumPipe implements PipeTransform {
  transform(value: string) {
    const prettyValue = value.split('_').map(p => (p.charAt(0).toUpperCase() + (p.substr(1, p.length - 1)).toLowerCase()));
    return prettyValue.join(' ');
  }
}
