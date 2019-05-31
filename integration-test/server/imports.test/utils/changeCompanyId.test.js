import { Meteor } from 'meteor/meteor';
import { resetDatabase } from 'meteor/xolvio:cleaner';
import { Accounts } from 'meteor/accounts-base';
import expect from 'must';
import faker from 'faker';

describe(('util changeCompanyId', function() {
  this.timeout(10000);

  beforeEach(function() {
    resetDatabase();
  });

  it('should success change company id', function() {
  });
}));
