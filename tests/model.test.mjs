import test from 'node:test';
import assert from 'node:assert/strict';
import {blankProfile,sampleProfile,validateProfile} from '../src/model.mjs';
test('minimum questions match brief, optional fields may be empty',()=>{assert.deepEqual(Object.keys(validateProfile(blankProfile)).sort(),['craft','credits','name','services']);assert.deepEqual(validateProfile({...sampleProfile(),photo:'',imdb:'',location:'',rate:''}),{});});
test('zero dollar rate is permitted; malformed IMDb and negative rates rejected',()=>{assert.deepEqual(validateProfile({...sampleProfile(),rate:'0'}),{});assert.ok(validateProfile({...sampleProfile(),rate:'-1'}).rate);assert.ok(validateProfile({...sampleProfile(),imdb:'javascript:alert(1)'}).imdb);});
