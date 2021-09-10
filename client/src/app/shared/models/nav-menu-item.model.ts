export class NavMenuItem {
  constructor(
    public title: string,
    public routerLink: string | string[],
    public permissions?: string,
    public disabled?: boolean,
  ) {}
}
