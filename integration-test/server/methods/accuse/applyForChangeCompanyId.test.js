import { Meteor } from 'meteor/meteor';
import { resetDatabase } from 'meteor/xolvio:cleaner';
import expect from 'must';
import faker from 'faker';

import { applyForChangeCompanyId } from '/server/methods/accuse/applyForChangeCompanyId';

describe('method applyForChangeCompanyId', function() {
  this.timeout(10000);

  let companyId;
  let currentUser;
  let reason;
  let violationCaseId;

  beforeEach(function() {
    resetDatabase();

    currentUser = {
      profile: {
        roles: ['fscMember']
      }
    };
    violationCaseId = undefined;
  });

  const runApplyForChangeCompanyId = () => {
    return applyForChangeCompanyId.bind(null, currentUser, { companyId, reason, violationCaseId });
  };

  it('should fail if the current user is not fsc member', function() {
    currentUser.profile.roles = [];

    runApplyForChangeCompanyId().must.throw(Meteor.Error, '權限不符，無法進行此操作！ [403]');
  });

  it('should fail if the company is not exist', function() {
    runApplyForChangeCompanyId().must.throw(Meteor.Error, `找不到識別碼為「${companyId}」的公司！ [404]`);
  });

  it('should fail if the violation case is not exist', function() {
    violationCaseId = faker.random.uuid();

    runApplyForChangeCompanyId().must.throw(Meteor.Error, `找不到識別碼為「${violationCaseId}」的違規案件！ [404]`);
  });

  it('should success apply for change companyId', function() {
    runApplyForChangeCompanyId().must.not.throw();
  });
});
