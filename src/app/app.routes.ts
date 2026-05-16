import { Routes } from '@angular/router';
import path from 'path';
import { TestComponent } from './test/test.component';

export const routes: Routes = [
    {  path: 'test', component: TestComponent},
    { path: '', component: TestComponent }
];
