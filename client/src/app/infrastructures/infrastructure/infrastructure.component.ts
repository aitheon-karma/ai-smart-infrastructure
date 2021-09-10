import { InfrastructureRestService } from '@aitheon/smart-infrastructure';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { InfrastructureService } from '../infrastructure.service';

@Component({
  selector: 'ai-infrastructure',
  templateUrl: './infrastructure.component.html',
  styleUrls: ['./infrastructure.component.scss']
})
export class InfrastructureComponent implements OnInit {

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private infrastructureService: InfrastructureService,
    private infrastructureRestService: InfrastructureRestService
  ) {}

  hideMenu: boolean;
  infrastructureId: string;
  infrastructure: any;

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const { id } = params;
      this.infrastructureId = id;
      this.infrastructureService.setInfrastructureId(id);
      this.infrastructureRestService.getById(id).subscribe(infrastructure => {
        this.infrastructure = infrastructure;
      })
    });
  }

  onActivate(event) {
    this.hideMenu = this.router.url === '/infrastructure/new-infrastructure';
  }
}
