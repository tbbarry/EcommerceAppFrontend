import { inject, Injectable } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { StoreSettingsService } from './store-settings.service';

@Injectable()
export class StoreTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);
  private readonly store = inject(StoreSettingsService);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    this.title.setTitle([this.buildTitle(snapshot), this.store.name()].filter(Boolean).join(' | '));
  }
}
