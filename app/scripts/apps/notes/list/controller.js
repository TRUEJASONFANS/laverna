/*global define*/
define([
    'jquery',
    'underscore',
    'backbone.radio',
    'marionette',
    'apps/notes/list/views/noteSidebar'
], function ($, _, Radio, Marionette, Sidebar) {
    'use strict';

    /**
     * Notes list controller - shows notes list in the sidebar
     *
     * Listens to
     * ----------
     * Events:
     * 1. channel: `appNote`, event: `model:active`
     *    triggers `focus` event on the passed model.
     * 2. channel: `notes`, event: `model:navigate`
     *    navigates to the model which was passed with the event.
     *
     * Triggers
     * --------
     * Events:
     * 1. channel: `global`, event: `navigate`
     *    to navigate to a note page
     */
    var Controller = Marionette.Object.extend({

        initialize: function(options) {
            this.radio = Radio.channel;
            this.options = options;
            _.bindAll(this, 'show', 'filter', 'navigate');

            // Listen to events
            this.listenTo(this.radio('appNote'), 'model:active', this.onModelActive, this);
            this.listenTo(this.radio('notes'), 'model:navigate', _.debounce(this.navigate, 420));

            // Fetch notes and show them
            this.filter(options);
        },

        onDestroy: function() {
            this.view.trigger('destroy');
        },

        /**
         * Renders the sidebar view
         */
        show: function(notes) {
            // Destroy old view
            if (this.view) {
                this.view.trigger('destroy');
                delete this.view;
            }

            // Render the view
            this.view = new Sidebar({
                collection: notes,
                args      : this.options
            });
            Radio.command('global', 'region:show', 'sidebar', this.view);
        },

        /**
         * Fetches data from `Notes` collection.
         */
        filter: _.debounce(function(options) {
            var tOptions = this.view ? this.view.options.args : {},
            isEqual = _.isEqual(
                _.omit((tOptions), 'id'),
                _.omit(options   , 'id')
            );

            // Do not fetch anything because nothing has changed
            if (isEqual) {
                return;
            }

            // Show the navbar
            Radio.command('navbar', 'start', options);
            this.options = options;

            // Fetch data
            Radio.request('notes', 'filter', options)
            .then(this.show);
        }, 100),

        onModelActive: function(model) {
            // The view was not rendered or the model is already active
            if (!this.view || !model || model.id === this.view.options.args.id) {
                return;
            }

            // Trigger `focus` event to a model.
            this.view.options.args.id = model.id;
            model = this.view.collection.get(model.id);
            if (model) {
                model.trigger('focus');
            }
        },

        navigate: function(model) {
            var args = Radio.request('appNote', 'route:args');

            /**
             * Before navigating to a note, change URI.
             * It is done because if a user navigates back to the same page
             * a note might not appear at all.
             */
            Radio.command('uri', 'navigate', {options: args}, {trigger: false});

            // Navigate to a note page
            Radio.command(
                'uri', 'navigate',
                {options: args, model: model}, {trigger: true}
            );
        }

    });

    return Controller;
});
