import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';

Meteor.methods({
  applyForChangeCompanyId({ companyId, reason, violationCaseId }) {
    check(companyId, String);
    check(reason, String);
    check(violationCaseId, Match.Optional(String));

    applyForChangeCompanyId(Meteor.user(), { companyId, reason, violationCaseId });

    return true;
  }
});
export function applyForChangeCompanyId(currentUser, { companyId, reason, violationCaseId }) {
}
