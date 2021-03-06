define(function(require, exports, module) {
    var _ = require('underscore');
    var AppFx = require('appfx.main');
    var BaseControl = require("appfx/splunkui/basecontrol");
    var Messages = require("appfx/splunkui/messages");

    // Let's load the charting script
    var chartingPrefix = AppFx.STATIC_PREFIX + "appfx/splunkjs/splunk.ui.charting.min.js";
    var chartingToken = splunkjs.UI.loadCharting(chartingPrefix);

    require("css!appfx/splunkui/chart.css");
        
    var Chart = BaseControl.extend({
        className: "appfx-chart",

        options: {
            contextid: null,
            datasource: "preview",
            type: "line"
        },
        
        initialize: function() {
            this.configure();
            
            this.settings.on("change:type", this.createChart, this);
            
            this.bindToComponent(this.settings.get("contextid"), this._onContextChange, this);
        },
        
        _onContextChange: function(contexts, context) {                
            if (this.context) {
                this.context.off(null, null, this);
                this.context = null;
            }  
            if (this.datasource) {
                this.datasource.off(null, null, this);
                this.datasource.destroy();
                this.datasource = null;
            }

            if (!context) {
                this.message("no-search");
                return;
            }

            this.context = context;
            this.datasource = this.context.data(this.settings.get("datasource"), {
                output_mode: "json_cols",
                count: 0
            });
            context.on("search:start", this._onSearchStart, this);
            context.on("search:progress", this._onSearchProgress, this);
            context.on("search:cancelled", this._onSearchCancelled, this);
            context.on("search:error", this._onSearchError, this);
            this.datasource.on("data", this.updateChart, this);
        },
        
        _onSearchProgress: function(properties) { 
            properties = properties || {};
            var content = properties.content || {};
            var previewCount = content.resultPreviewCount || 0;
            var isJobDone = content.isDone || false;

            if (previewCount === 0 && isJobDone) {
                this.message('no-results');
                return;
            }
            
            if (previewCount === 0) {
                this.message('waiting');
                return;
            }
        },
        
        _onSearchCancelled: function() {
            this.message('cancelled');
        },
        
        _onSearchError: function(message) {
            this.message({
                level: "warning",
                icon: "warning-sign",
                message: message
            });
        },
        
        _onSearchStart: function() {
            this.message('waiting');
        },
        
        message: function(info) {
            Messages.render(info, this.$el);
        },

        render: function() {
            if (this.chart) {
                this.chart.destroy();
                this.chart = null;
            }
            
            this.createChart();
            
            return this;
        },
        
        show: function() {
            this.$el.css('display', '');
        },
        
        hide: function() {
            this.$el.css('display', 'none');
        },
        
        createChart: function() {
            var that = this;
            splunkjs.UI.ready(chartingToken, function() {
                if (that.chart) {
                    // If we already have a chart created,
                    // then just return
                    return;
                }
                
                that.chart = new splunkjs.UI.Charting.Chart(
                    that.$el, 
                    that.settings.get("type"),
                    false
                );
                
                that.chart.chart.addEventListener("chartClicked", _.bind(that.chartClicked, that));
                that.chart.chart.addEventListener("legendClicked", _.bind(that.legendClicked, that));
                
                that.updateChart();
            });
        },
        
        updateChart: function() {
            if (this.datasource) {
                this.chartData = this.datasource.data();
            }
            
            if (!this.chartData || !this.datasource.hasData()) {
                return;
            }
            
            var data = this.chartData;
            if (this.chart) {
                // We always enable chart/legend click
                this.chart.setData(
                    data, 
                    _.extend(this.settings.toJSON(), { enableChartClick: true, enableLegendClick: true })
                );
                this.chart.draw();
            }
        },
        
        chartClicked: function(e) {
            this.trigger("clicked:chart", e);
        },
        
        legendClicked: function(e) {
            this.trigger("clicked:legend", e);
        }
    });
    
    AppFx.Components.registerType('appfx-chart', Chart); 
    
    return Chart;
});
