'use strict';
import { Template } from 'meteor/templating';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { dbSeason } from '../../db/dbSeason';
import { inheritedShowLoadingOnSubscribing } from '../layout/loading';

inheritedShowLoadingOnSubscribing(Template.seasonalReportRedirect);
Template.seasonalReportRedirect.onCreated(function() {
  this.subscribe('currentSeason');
  this.autorun(() => {
    const previousSeasonData = dbSeason.findOne({}, {
      sort: {
        beginDate: -1
      },
      skip: 1
    });
    if (previousSeasonData) {
      const path = FlowRouter.path('seasonalReport', {
        seasonId: previousSeasonData._id
      });
      FlowRouter.go(path);
    }
  });
});

