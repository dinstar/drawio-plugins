/**
 * Tags plugin.
 * 
 * - Set tags via dialog
 * - Toggle hidden tags
 * - Stateless filter
 * 
 * TODO:
 * 
 * - Add hiddenTags to viewState of page
 * - Export to PDF ignores current tags
 * - Sync hiddenTags with removed tags
 */
Draw.loadPlugin(function(editorUi)
{
    var
      div = document.createElement('div'),
    	menu = editorUi.menus.get('extras'),
    	oldFunct = menu.funct;

    // Adds action
    function addAction()
    {
        if (editorUi.hiddenTagsWindow == null)
        {
            editorUi.hiddenTagsWindow = new HiddenTagsWindow(editorUi, document.body.offsetWidth - 380, 120, 300, 240);
            editorUi.hiddenTagsWindow.window.addListener('show', function()
            {
                editorUi.fireEvent(new mxEventObject('hiddenTags'));
            });
            editorUi.hiddenTagsWindow.window.addListener('hide', function()
            {
                editorUi.fireEvent(new mxEventObject('hiddenTags'));
            });
            editorUi.hiddenTagsWindow.window.setVisible(true);
            editorUi.fireEvent(new mxEventObject('hiddenTags'));
        }
        else
        {
            editorUi.hiddenTagsWindow.window.setVisible(!editorUi.hiddenTagsWindow.window.isVisible());
        }
    }

  menu.funct = function(menu, parent)
    {
        oldFunct.apply(this, arguments);
        
        editorUi.menus.addMenuItems(menu, ['-', 'hiddenTags'], parent);
    };

  // Adds resource for action
    mxResources.parse('hiddenTags=Hidden Tags');

  editorUi.actions.addAction('hiddenTags...', addAction);

    function HiddenTagsWindow(editorUi, x, y, w, h)
    {
        var graph = editorUi.editor.graph;
    
        var div = document.createElement('div');
        div.style.overflow = 'hidden';
        div.style.padding = '12px 8px 12px 8px';
        div.style.height = 'auto';
        
        var searchInput = document.createElement('input');
        searchInput.setAttribute('placeholder', 'Type in the tags and press Enter to add them');
        searchInput.setAttribute('type', 'text');
        searchInput.style.width = '100%';
        searchInput.style.boxSizing = 'border-box';
        searchInput.style.fontSize = '12px';
        searchInput.style.borderRadius = '4px';
        searchInput.style.padding = '4px';
        searchInput.style.marginBottom = '8px';
        div.appendChild(searchInput);
    
        var filterInput = searchInput.cloneNode(true);
        filterInput.setAttribute('placeholder', 'Filter tags');
        div.appendChild(filterInput);
    
        var tagCloud = document.createElement('div');
        tagCloud.style.position = 'relative';
        tagCloud.style.fontSize = '12px';
        tagCloud.style.height = 'auto';
        div.appendChild(tagCloud);
    
        var graph = editorUi.editor.graph;
        var lastValue = null;

        // Function to set custom document properties
        function savePluginState(name, properties)
        {
            var model = graph.model;
            try {
                    var
                        root = model.getRoot(),
                        docProperties = JSON.parse(root.value || '{}');
                    docProperties[name] = properties;
                    root.value = JSON.stringify(docProperties);
                }
                catch (e)
                {
                    console.error('Error saving plugin state:', e, name, properties);
                }
        }

        // Function to get custom document properties
        function loadPluginState(name, defaultValue)
        {
            try
            {
                var
                    root = graph.model.getRoot();
                    if (root.value == null)
                        return defaultValue;
                var
                    docProperties = JSON.parse(root.value || '{}');
                return docProperties[name] || {};
            }
            catch (e)
            {
                console.error('Error loading plugin state:', e);
            }
            return {};
        }

        function getLookup(tagList)
        {
            var lookup = {};
            
            for (var i = 0; i < tagList.length; i++)
            {
                lookup[tagList[i].toLowerCase()] = true;
            }
            
            return lookup;
        };
        
        function getAllTags()
        {
            return graph.getTagsForCells(graph.model.getDescendants(
                graph.model.getRoot()));
        };
    
        /**
         * Returns true if tags exist and are all in lookup.
         */
        function showBasedOnTags(cell, visibleLookup, tagCount)
        {
            var
                tags = graph.getTagsForCell(cell).toLowerCase().split(' ').filter(v => v.length > 0),
                res = getResult();

            function getResult()
            {
                if (tagCount == 0)
                    return true;
                if (tags.length == 0)
                    return true;
                
                for (var i = 0; i < tags.length; i++)
                    if (visibleLookup[tags[i]])
                        return true;
                
                return false;
            }

            return res;
        }
        
        var hiddenTags = {};
        var hiddenTagCount = 0;
        var graph_isCellVisible = graph.isCellVisible;
    
        graph.isCellVisible = function(cell)
        {
            return graph_isCellVisible.apply(this, arguments) &&
                showBasedOnTags(cell, hiddenTags, hiddenTagCount);
        };
        
        function setCellsVisibleForTag(tag, visible)
        {
            var cells = graph.getCellsForTags([tag], null, true);
            
            // Ignores layers for selection
            var temp = [];
            
            for (var i = 0; i < cells.length; i++)
            {
                if (graph.model.isVertex(cells[i]) || graph.model.isEdge(cells[i]))
                {
                    temp.push(cells[i]);
                }
            }
            
            graph.setCellsVisible(cells, visible);
        };
    
        function updateSelectedTags(tags, selected, selectedColor, filter)
        {
            tagCloud.innerText = '';
            
            var title = document.createElement('div');
            title.style.marginBottom = '8px';
            mxUtils.write(title, (filter != null) ? 'Select hidden tags:' : 'Or add/remove existing tags for cell(s):');
            tagCloud.appendChild(title);
            
            var found = 0;

            function checkSelected(selectedKey)
            {
                if ( ! tags.includes(selectedKey))
                    delete selected[selectedKey];
            }

            Object.keys(selected).forEach(checkSelected);
            
            for (var i = 0; i < tags.length; i++)
            {
                if (filter == null || tags[i].substring(0, filter.length) == filter)
                {
                    var span = document.createElement('span');
                    span.style.display = 'inline-block';
                    span.style.padding = '6px 8px';
                    span.style.borderRadius = '6px';
                    span.style.marginBottom = '8px';
                    span.style.maxWidth = '80px';
                    span.style.overflow = 'hidden';
                    span.style.textOverflow = 'ellipsis';
                    span.style.cursor = 'pointer';
                    span.setAttribute('title', tags[i]);
                    span.style.border = '1px solid #808080';
                    mxUtils.write(span, tags[i]);
                    
                    if (selected[tags[i]])
                    {
                        span.style.background = selectedColor;
                        span.style.color = '#ffffff';
                    }
                    else
                    {
                        span.style.background = (Editor.isDarkMode()) ? 'transparent' : '#ffffff';
                    }
                    
                    mxEvent.addListener(span, 'click', onTagClick(selected, tags[i]));
                    
                    tagCloud.appendChild(span);
                    mxUtils.write(tagCloud, ' ');
                    found++;
                }
            }
    
            if (found == 0)
            {
                mxUtils.write(tagCloud, 'No tags found');
            }
        };

        function onTagClick(selected, tag)
        {
            return function()
            {
                console.info('onTagClick', tag);
                if (!selected[tag])
                {
                    if (!graph.isSelectionEmpty())
                    {
                        graph.addTagsForCells(graph.getSelectionCells(), [tag])
                    }
                    else
                    {
                        hiddenTags[tag] = true;
                        hiddenTagCount++;
                        savePluginState('hiddenTags', hiddenTags);
                        refreshAddonPanel();
                        
                        window.setTimeout(function() { graph.refresh(); }, 0);
                    }
                }
                else
                {
                    if (!graph.isSelectionEmpty())
                    {
                        graph.removeTagsForCells(graph.getSelectionCells(), [tag])
                    }
                    else
                    {
                        delete hiddenTags[tag];
                        hiddenTagCount--;
                        savePluginState('hiddenTags', hiddenTags);
                        refreshAddonPanel();
                        
                        window.setTimeout(function() { graph.refresh(); }, 0);
                    }
                }
            };
        }
        
        function updateTagCloud(tags)
        {
            updateSelectedTags(tags, hiddenTags, '#bb0000', filterInput.value);
        };
        
        function loadDocState()
        {
            hiddenTags = loadPluginState('hiddenTags', hiddenTags);
            hiddenTagCount = Object.keys(hiddenTags).length;
        }

        function refreshAddonPanel()
        {
            if (graph.isSelectionEmpty())
            {
                updateTagCloud(getAllTags(), hiddenTags);
                searchInput.style.display = 'none';
                filterInput.style.display = '';
            }
            else
            {
                updateSelectedTags(getAllTags(), getLookup(graph.getCommonTagsForCells(graph.getSelectionCells())), '#2873e1');
                searchInput.style.display = '';
                filterInput.style.display = 'none';
            }
        }
        
        loadDocState();
        refreshAddonPanel();
    
        graph.selectionModel.addListener(mxEvent.CHANGE, function(sender, evt)
        {
            refreshAddonPanel();
        });

        graph.model.addListener(mxEvent.CHANGE, function(sender, evt)
        {
            loadDocState();
            window.setTimeout(function() { graph.refresh(); }, 0);
            refreshAddonPanel();
        });
    
        mxEvent.addListener(filterInput, 'keyup', function()
        {
            updateTagCloud(getAllTags());
        });
        
        mxEvent.addListener(searchInput, 'keyup', function(evt)
        {
            // Ctrl or Cmd keys
            if (evt.keyCode == 13)
            {
                graph.addTagsForCells(graph.getSelectionCells(), searchInput.value.toLowerCase().split(' '));
                searchInput.value = '';
            }
        });
    
        this.window = new mxWindow(mxResources.get('hiddenTags'), div, x, y, w, null, true, true);
        this.window.destroyOnClose = false;
        this.window.setMaximizable(false);
        this.window.setResizable(true);
        this.window.setScrollable(true);
        this.window.setClosable(true);
        this.window.contentWrapper.style.overflowY = 'scroll';
        
        this.window.addListener('show', mxUtils.bind(this, function()
        {
            this.window.fit();
            
            if (this.window.isVisible())
            {
                loadDocState();
                window.setTimeout(function() { graph.refresh(); }, 0);

                searchInput.focus();
                
                if (mxClient.IS_GC || mxClient.IS_FF || document.documentMode >= 5)
                {
                    searchInput.select();
                }
                else
                {
                    document.execCommand('selectAll', false, null);
                }
            }
            else
            {
                graph.container.focus();
            }
        }));
        
        this.window.setLocation = function(x, y)
        {
            var iw = window.innerWidth || document.body.clientWidth || document.documentElement.clientWidth;
            var ih = window.innerHeight || document.body.clientHeight || document.documentElement.clientHeight;
            
            x = Math.max(0, Math.min(x, iw - this.table.clientWidth));
            y = Math.max(0, Math.min(y, ih - this.table.clientHeight - 48));
    
            if (this.getX() != x || this.getY() != y)
            {
                mxWindow.prototype.setLocation.apply(this, arguments);
            }
        };
        
        var resizeListener = mxUtils.bind(this, function()
        {
            var x = this.window.getX();
            var y = this.window.getY();
            
            this.window.setLocation(x, y);
        });
        
        mxEvent.addListener(window, 'resize', resizeListener);
    
        this.destroy = function()
        {
            mxEvent.removeListener(window, 'resize', resizeListener);
            this.window.destroy();
        }
    };    
});
