import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PaiementSuccessComponent } from './paiement-success.component';

describe('PaiementSuccessComponent', () => {
  let component: PaiementSuccessComponent;
  let fixture: ComponentFixture<PaiementSuccessComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaiementSuccessComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PaiementSuccessComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
