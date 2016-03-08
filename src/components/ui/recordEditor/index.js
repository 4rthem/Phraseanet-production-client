import * as recordModel from '../../record/model';

//var p4 = p4 || {};

const recordEditor = (services) => {
    const {configService, localeService, appEvents} = services;
    let $container = null;
    let editor = {};
    let ETHSeeker;
    var $editorContainer = null;
    $(document).ready(function () {
        $editorContainer = $('#EDITWINDOW');
        $(window).bind('resize', function () {
            _setPreviewEdit();
            _setSizeLimits();
        });


        // idEditZTextArea
    });

    let $ztextStatus;
    let $editTextArea;
    const initialize = () => {
        editor = {};
        editor.curField = '?'; //"?";
        editor.$container = $('#idFrameE');
        editor.textareaIsDirty = false;
        editor.fieldLastValue = "";
        editor.lastClickId = null;
        editor.sbas_id = false;
        editor.what = false;
        //editor.regbasprid = false;
        editor.newrepresent = false;
        //editor.ssel = false;

        $ztextStatus = $("#ZTextStatus", editor.$container);
        $editTextArea = $("#idEditZTextArea", editor.$container);
        _bindEvents();
    };

    const _bindEvents = () => {
        // edit_clk_editimg
        $editorContainer
            .on('click', '.select-record-action', (event) => {
                let $el = $(event.currentTarget);
                console.log('select record action')
                _onSelectRecord(event, $el.data('index'));
            })
            // set grouping (regroupement) image
            .on('click', '.set-grouping-image-action', (event) => {
                let $el = $(event.currentTarget);
                console.log('select record action')
                setRegDefault($el.data('index'), $el.data('record-id'));
            })
            // status field edition
            .on('click', '.edit-status-action', (event) => {
                event.cancelBubble = true;
                event.stopPropagation();

                if (!editor.textareaIsDirty || edit_validField(event, "ask_ok") == true) {
                    _editStatus(event);
                }
                return false;
            })
            // edit field by name / set active for edition
            .on('click', '.edit-field-action', (event) => {
                console.log('ok catch event for edit-field-by-name-action')
                let $el = $(event.currentTarget);
                if (!editor.textareaIsDirty || edit_validField(event, "ask_ok") == true) {
                    _editField(event, $el.data('id'));
                }
                return false;
            })
            .on('click', '.field-navigate-action', (event) => {
                event.preventDefault();
                let $el = $(event.currentTarget);
                let dir = $el.data('direction') === 'forward' ? 1 : -1;

                fieldNavigate(event, dir);
            })
            .on('click submit', '.add-multivalued-field-action', (event) => {
                event.preventDefault();
                let $el = $(event.currentTarget);
                let fieldValue = $('#' + $el.data('input-id')).val();

                _addMultivaluedField(fieldValue , null);
            })
            .on('click', '.edit-multivalued-field-action', (event) => {
                event.preventDefault();
                let $el = $(event.currentTarget);

                _editMultivaluedField(event, $el.data('index'));
            })
            .on('click', '.toggle-status-field-action', (event) => {
                event.preventDefault();
                let $el = $(event.currentTarget);
                let state = $el.data('state') === 1 ? 1 : 0;
                edit_clkstatus(event, $el.data('bit'), state)
            })
            .on('click', '.commit-field-action', (event) => {
                event.preventDefault();
                let $el = $(event.currentTarget);
                edit_validField(event, $el.data('mode'))
            })

            .on('dblclick click', '.edit-thesaurus-action', (event) => {
                event.preventDefault();
                if( event.type === 'dblclick') {
                    edit_dblclickThesaurus(event)
                } else {
                    edit_clickThesaurus(event)
                }
            })

            .on('change', '.toggle-replace-mode-action', (event) => {
                event.preventDefault();
                _toggleReplaceMode(event)
            })

            .on('click', '.apply-multi-desc-action', (event) => {
                event.preventDefault();
                edit_applyMultiDesc(event)
            })
            .on('click', '.cancel-multi-desc-action', (event) => {
                event.preventDefault();
                edit_cancelMultiDesc(event)
            })

            .on('mouseup mousedown keyup keydown', '#idEditZTextArea', function(event){


                switch (event.type) {
                    case 'mouseup':
                        _onTextareaMouseUp(event);
                        break;
                    case 'mousedown':
                        _onTextareaMouseDown(event);
                        break;
                    case 'keyup':
                        _onTextareaKeyUp(event);
                        break;
                    case 'keydown':
                        _onTextareaKeyDown(event);
                        break;
                    default:
                }
            });

    };

    function startThisEditing(options) {//sbas_id, what, regbasprid, ssel) {
        let {databoxId, mode, state} = options;

        editor.sbas_id = databoxId;
        editor.what = mode;
        editor = Object.assign(editor, state);
        //editor.regbasprid = regbasprid;
        //editor.ssel = ssel;
        $editTextArea = $("#idEditZTextArea", editor.$container);

        let recordCollection = editor.T_records;
        for (var r in recordCollection) {
            var fields = {};

            for (var f in editor.T_records[r].fields) {

                var meta_struct_id = editor.T_records[r].fields[f].meta_struct_id;

                var name = editor.T_fields[meta_struct_id].name;
                var label = editor.T_fields[meta_struct_id].label;
                var multi = editor.T_fields[meta_struct_id].multi;
                var required = editor.T_fields[meta_struct_id].required;
                var readonly = editor.T_fields[meta_struct_id].readonly;
                var maxLength = editor.T_fields[meta_struct_id].maxLength;
                var minLength = editor.T_fields[meta_struct_id].minLength;
                var type = editor.T_fields[meta_struct_id].type;
                var separator = editor.T_fields[meta_struct_id].separator;
                var vocabularyControl = editor.T_fields[meta_struct_id].vocabularyControl || null;
                var vocabularyRestricted = editor.T_fields[meta_struct_id].vocabularyRestricted  || null;

                var fieldOptions = {
                    multi: multi,
                    required: required,
                    readonly: readonly,
                    maxLength: maxLength,
                    minLength: minLength,
                    type: type,
                    separator: separator,
                    vocabularyControl: vocabularyControl,
                    vocabularyRestricted: vocabularyRestricted
                };

                var databoxField = new recordModel.databoxField(name, label, meta_struct_id, fieldOptions);

                var values = [];

                for (var v in editor.T_records[r].fields[f].values) {
                    var meta_id = editor.T_records[r].fields[f].values[v].meta_id;
                    var value = editor.T_records[r].fields[f].values[v].value;
                    var vocabularyId = editor.T_records[r].fields[f].values[v].vocabularyId;

                    values.push(new recordModel.recordFieldValue(meta_id, value, vocabularyId));
                }

                fields[f] = new recordModel.recordField(databoxField, values);
            }

            editor.T_records[r].fields = fields;
            editor.fields = fields;

        }

        $('#EditTextMultiValued').bind('keyup', function () {
            _reveal_mval($(this).val());
        });

        $('#EDIT_MID_R .tabs').tabs();

        $('#divS div.edit_field:odd').addClass('odd');
        $('#divS div').bind('mouseover',function () {
            $(this).addClass('hover');
        }).bind('mouseout', function () {
            $(this).removeClass('hover');
        });

        $('#editcontextwrap').remove();

        if ($('#editcontextwrap').length == 0)
            $('body').append('<div id="editcontextwrap"></div>');


        // if is a group, only select the group
        if (editor.what === 'GRP') {
            _toggleGroupSelection();
        } else {
            _edit_select_all();
        }


        $('.previewTips, .DCESTips, .fieldTips', editor.$container).tooltip({
            fixable: true,
            fixableIndex: 1200
        });
        $('.infoTips', editor.$container).tooltip();

        if (editor.what == 'GRP') {
            $('#EDIT_FILM2 .reg_opts').show();

            $.each($('#EDIT_FILM2 .contextMenuTrigger'), function () {

                var id = $(this).attr('id').split('_').slice(1, 3).join('_');
                $(this).contextMenu('#editContext_' + id + '', {
                    appendTo: '#editcontextwrap',
                    openEvt: 'click',
                    dropDown: true,
                    theme: 'vista',
                    showTransition: 'slideDown',
                    hideTransition: 'hide',
                    shadow: false
                });
            });
        }

        _hsplit1();
        _vsplit2();
        _vsplit1();

        $('#EDIT_TOP', editor.$container).resizable({
            handles: 's',
            minHeight: 100,
            resize: function () {
                _hsplit1();
                _setPreviewEdit();
            },
            stop: function () {
                _hsplit1();
                userModule.setPref('editing_top_box', Math.floor($('#EDIT_TOP').height() * 100 / $('#EDIT_ALL').height()));
                _setSizeLimits();
            }
        });

        $('#divS_wrapper', editor.$container).resizable({
            handles: 'e',
            minWidth: 200,
            resize: function () {
                _vsplit1();
                _setPreviewEdit();
            },
            stop: function () {
                userModule.setPref('editing_right_box', Math.floor($('#divS').width() * 100 / $('#EDIT_MID_L').width()));
                _vsplit1();
                _setSizeLimits();
            }
        });

        $('#EDIT_MID_R')
            .css('left', $('#EDIT_MID_L').position().left + $('#EDIT_MID_L').width() + 15)
            .resizable({
                handles: 'w',
                minWidth: 200,
                resize: function () {
                    _vsplit2();
                    _setPreviewEdit();
                },
                stop: function () {
                    userModule.setPref('editing_left_box', Math.floor($('#EDIT_MID_R').width() * 100 / $('#EDIT_MID').width()));
                    _vsplit2();
                    _setSizeLimits();
                }
            });

        $('#EDIT_ZOOMSLIDER', editor.$container).slider({
            min: 60,
            max: 300,
            value: editor.diapoSize,
            slide: function (event, ui) {
                var v = $(ui.value)[0];
                $('#EDIT_FILM2 .diapo', editor.$container).width(v).height(v);
            },
            change: function (event, ui) {
                editor.diapoSize = $(ui.value)[0];
                userModule.setPref("editing_images_size", editor.diapoSize);
            }
        });

        var buttons = {};
        buttons[localeService.t('valider')] = function (e) {
            $(this).dialog("close");
            edit_applyMultiDesc(e);
        };
        buttons[localeService.t('annuler')] = function (e) {
            $(this).dialog("close");
            edit_cancelMultiDesc(e);
        };

        $("#EDIT_CLOSEDIALOG", editor.$container).dialog({
            autoOpen: false,
            closeOnEscape: true,
            resizable: false,
            draggable: false,
            modal: true,
            buttons: buttons
        });

        var buttons = {};

        buttons[localeService.t('valider')] = function () {
            var form = $("#Edit_copyPreset_dlg FORM");
            var jtitle = $(".EDIT_presetTitle", form);
            if (jtitle.val() == '') {
                alert(localeService.t('needTitle'));
                jtitle[0].focus();
                return;
            }

            var fields = [];
            $(":checkbox", form).each(function (idx, elem) {
                var $el = $(elem);
                if ($el.is(":checked")) {
                    var val = $el.val();
                    var field = {
                        name: editor.T_fields[val].name,
                        value: []
                    };
                    var tval;
                    if (editor.T_fields[val].multi) {
                        field.value = $.map(
                            editor.T_fields[val]._value.split(";"),
                            function(obj, idx){
                                return obj.trim();
                            }
                        );
                    } else {
                        field.value = [editor.T_fields[val]._value.trim()];
                    }
                    fields.push(field);
                }
            });

            $.ajax({
                type: 'POST',
                url: "../prod/records/edit/presets",
                data: {
                    sbas_id: editor.sbas_id,
                    title: jtitle.val(),
                    fields: fields
                },
                dataType: 'json',
                success: function (data, textStatus) {
                    _preset_paint(data);

                    if ($("#Edit_copyPreset_dlg").data("ui-dialog")) {
                        $("#Edit_copyPreset_dlg").dialog("close");
                    }
                }
            });
        };

        buttons[localeService.t('annuler')] = function () {
            $(this).dialog("close");

        };

        $("#Edit_copyPreset_dlg", editor.$container).dialog({
            stack: true,
            closeOnEscape: true,
            resizable: false,
            draggable: false,
            autoOpen: false,
            modal: true,
            width: 600,
            title: localeService.t('newPreset'),
            close: function (event, ui) {
                $(this).dialog("widget").css("z-index", "auto");
            },
            open: function (event, ui) {
                $(this).dialog("widget").css("z-index", "5000");
                $(".EDIT_presetTitle")[0].focus();
            },
            buttons: buttons
        });

        $('#idEditDateZone', editor.$container).datepicker({
            changeYear: true,
            changeMonth: true,
            dateFormat: 'yy/mm/dd',
            onSelect: function (dateText, inst) {
                var lval = $editTextArea.val();
                if (lval != dateText) {
                    fieldLastValue = lval;
                    $editTextArea.val(dateText);
                    $('#idEditZTextArea').trigger('keyup.maxLength');
                    textareaIsDirty = true;
                    edit_validField(null, 'ok');
                }
            }
        });

        ETHSeeker = new _EditThesaurusSeeker(editor.sbas_id);

        _setSizeLimits();

        $.ajax({
            type: 'GET',
            url: "../prod/records/edit/presets",
            data: {
                sbas_id: editor.sbas_id
            },
            dataType: 'json',
            success: function (data, textStatus) {
                _preset_paint(data);
            }
        });

        _check_required();

        $('#TH_Opresets button.adder').bind('click', function () {
            _preset_copy();
        });

        try {
            $('#divS .edit_field:first').trigger('mousedown');
        }
        catch (err) {

        }
    }

    function _toggleGroupSelection() {
        var groupIndex = 0;
        _onSelectRecord(false, groupIndex);

    }

    function _preset_paint(data) {
        $(".EDIT_presets_list", editor.$container).html(data.html);
        $(".EDIT_presets_list A.triangle").click(
            function () {
                $(this).parent().parent().toggleClass("opened");
                return false;
            }
        );

        $(".EDIT_presets_list A.title").dblclick(
            function () {
                var preset_id = $(this).parent().parent().attr("id");
                if (preset_id.substr(0, 12) == "EDIT_PRESET_")
                    _preset_load(preset_id.substr(12));
                return false;
            }
        );

        $(".EDIT_presets_list A.delete").click(
            function () {
                var li = $(this).closest("LI");
                var preset_id = li.attr("id");
                var title = $(this).parent().children(".title").html();
                if (preset_id.substr(0, 12) == "EDIT_PRESET_" && confirm("supprimer le preset '" + title + "' ?")) {
                    _preset_delete(preset_id.substr(12), li);
                }
                return false;
            }
        );
    }

    function _preset_copy() {
        var html = "";
        for (i in editor.T_fields) {
            if (editor.T_fields[i]._status == 1) {
                if (editor.T_fields[i].readonly) {
                    continue;
                }
                var c = editor.T_fields[i]._value === "" ? "" : "checked=\"1\"";
                var v = editor.T_fields[i]._value;
                html += "<div><label class=\"checkbox\" for=\"new_preset_" + editor.T_fields[i].name + "\"><input type=\"checkbox\" class=\"checkbox\" id=\"new_preset_" + editor.T_fields[i].name + "\" value=\"" + i + "\" " + c + "/>" + "<b>" + editor.T_fields[i].label + " : </b></label> ";
                html += _cleanTags(editor.T_fields[i]._value) + "</div>";
            }
        }
        $("#Edit_copyPreset_dlg FORM DIV").html(html);
        var $dialog = $("#Edit_copyPreset_dlg");
        if ($dialog.data("ui-dialog")) {
            // to show dialog on top of edit window
            $dialog.dialog("widget").css("z-index", 1300);
            $dialog.dialog("open");
        }
    }

    function _preset_delete(preset_id, li) {
        $.ajax({
            type: 'DELETE',
            url: "../prod/records/edit/presets/" + preset_id,
            data: {},
            dataType: 'json',
            success: function (data, textStatus) {
                li.remove();
            }
        });
    }

    function _preset_load(preset_id) {
        $.ajax({
            type: 'GET',
            url: "../prod/records/edit/presets/" + preset_id,
            data: {},
            dataType: 'json',
            success: function (data, textStatus) {
                if ($("#Edit_copyPreset_dlg").data("ui-dialog")) {
                    $("#Edit_copyPreset_dlg").dialog("close");
                }

                for (i in editor.T_fields) {
                    editor.T_fields[i].preset = null;
                    if (typeof(data.fields[editor.T_fields[i].name]) != "undefined") {
                        editor.T_fields[i].preset = data.fields[editor.T_fields[i].name];
                    }
                }
                for (var r = 0; r < editor.T_records.length; r++) {
                    if (!editor.T_records[r]._selected)
                        continue;

                    for (i in editor.T_fields) {
                        if (editor.T_fields[i].preset != null) {
                            for (val in editor.T_fields[i].preset) {
                                // fix : some (old, malformed) presets values may need trim()
                                editor.T_records[r].fields["" + i].addValue(editor.T_fields[i].preset[val].trim(), false, null);
                            }
                        }
                    }
                }
                _updateEditSelectedRecords();
            }
        });
    }

    function _setPreviewEdit() {
        console.log('open preview tab')
        if (!$('#TH_Opreview').is(':visible'))
            return false;

        var selected = $('#EDIT_FILM2 .diapo.selected');

        if (selected.length != 1) {
            return;
        }

        var id = selected.attr('id').split('_').pop();

        var container = $('#TH_Opreview');
        var zoomable = $('img.record.zoomable', container);

        if (zoomable.length > 0 && zoomable.hasClass('zoomed'))
            return;

        //  var datas = editor.T_records[id].preview;

        var h = parseInt($('input[name=height]', container).val());
        var w = parseInt($('input[name=width]', container).val());

        //  if(datas.doctype == 'video')
        //  {
        //    var h = parseInt(datas.height);
        //    var w = parseInt(datas.width);
        //  }
        var t = 0;
        var de = 0;

        var margX = 0;
        var margY = 0;

        if ($('img.record.record_audio', container).length > 0) {
            var margY = 100;
            de = 60;
        }

        var display_box = $('#TH_Opreview .PNB10');
        var dwidth = display_box.width();
        var dheight = display_box.height();


        //  if(datas.doctype != 'flash')
        //  {
        var ratioP = w / h;
        var ratioD = dwidth / dheight;

        if (ratioD > ratioP) {
            //je regle la hauteur d'abord
            if ((parseInt(h) + margY) > dheight) {
                h = Math.round(dheight - margY);
                w = Math.round(h * ratioP);
            }
        }
        else {
            if ((parseInt(w) + margX) > dwidth) {
                w = Math.round(dwidth - margX);
                h = Math.round(w / ratioP);
            }
        }
        //  }
        //  else
        //  {
        //
        //    h = Math.round(dheight - margY);
        //    w = Math.round(dwidth - margX);
        //  }
        t = Math.round((dheight - h - de) / 2);
        var l = Math.round((dwidth - w) / 2);
        $('.record', container).css({
            width: w,
            height: h,
            top: t,
            left: l
        }).attr('width', w).attr('height', h);

    }

    function _previewEdit(r) {
console.log('try to append', editor.T_records[r].preview)

        $('#TH_Opreview .PNB10').empty().append(editor.T_records[r].preview);

        if ($('img.PREVIEW_PIC.zoomable').length > 0) {
            $('img.PREVIEW_PIC.zoomable').draggable();
        }
        _setPreviewEdit();
    }

    function skipImage(evt, step) {
        var cache = $('#EDIT_FILM2');
        var first = $('.diapo.selected:first', cache);
        var last = $('.diapo.selected:last', cache);
        var sel = $('.diapo.selected', cache);

        sel.removeClass('selected');

        var i = step == 1 ? (parseInt(last.attr('pos')) + 1) : (parseInt(first.attr('pos')) - 1);

        if (i < 0)
            i = parseInt($('.diapo:last', cache).attr('pos'));
        else if (i >= $('.diapo', cache).length)
            i = 0;

        _onSelectRecord(evt, i);
    }

    function setRegDefault(n, record_id) {
        editor.newrepresent = record_id;

        var src = $('#idEditDiapo_' + n).find('img.edit_IMGT').attr('src');
        var style = $('#idEditDiapo_' + n).find('img.edit_IMGT').attr('style');

        $('#EDIT_GRPDIAPO .edit_IMGT').attr('src', src).attr('style', style);
    }

    //// ---------------------------------------------------------------------------
//// on change de champ courant
//// ---------------------------------------------------------------------------

    function _editField(evt, meta_struct_id) {
        document.getElementById('idEditZTextArea').blur();
        document.getElementById('EditTextMultiValued').blur();
        $(".editDiaButtons", editor.$container).hide();

        $('#idEditZTextArea, #EditTextMultiValued').unbind('keyup.maxLength');


        editor.curField = meta_struct_id;

        if (meta_struct_id >= 0 ) {


            let field = null;
            if( editor.T_fields === undefined ) {
                return;
            }

            if( editor.T_fields[meta_struct_id] !== undefined ) {
                field = editor.T_fields[meta_struct_id];

                var name = field.required ? field.label + '<span style="font-weight:bold;font-size:16px;"> * </span>' : field.label;

                $("#idFieldNameEdit", editor.$container).html(name);


                var vocabType = editor.T_fields[meta_struct_id].vocabularyControl;

                $('#idEditZTextArea, #EditTextMultiValued').autocomplete({
                    minLength: 2,
                    appendTo: "#idEditZone",
                    source: function (request, response) {
                        $.ajax({
                            url: '../prod/records/edit/vocabulary/' + vocabType + '/',
                            dataType: "json",
                            data: {
                                sbas_id: editor.sbas_id,
                                query: request.term
                            },
                            success: function (data) {
                                response(data.results);
                            }
                        });
                    },
                    select: function (event, ui) {

                        _addMultivaluedField(ui.item.label, ui.item.id);

                        return false;
                    }
                });


                if (editor.T_fields[meta_struct_id].maxLength > 0) {
                    var idexplain = $("#idExplain");
                    idexplain.html('');

                    $('#idEditZTextArea, #EditTextMultiValued').bind('keyup.maxLength',function () {
                        var remaining = Math.max((editor.T_fields[meta_struct_id].maxLength - $(this).val().length), 0);
                        idexplain.html("<span class='metadatas_restrictionsTips' tooltipsrc='../prod/tooltip/metas/restrictionsInfos/" + editor.sbas_id + "/" + meta_struct_id + "/'><img src='/assets/common/images/icons/help32.png' /><!--<img src='/assets/common/images/icons/alert.png' />--> Caracteres restants : " + (remaining) + "</span>");
                        $('.metadatas_restrictionsTips', idexplain).tooltip();
                    }).trigger('keyup.maxLength');
                }
                else {
                    $("#idExplain").html("");
                }

                if (!editor.T_fields[meta_struct_id].multi) {
                    // champ monovalue : textarea
                    $(".editDiaButtons", editor.$container).hide();

                    if (editor.T_fields[meta_struct_id].type == "date") {
                        $editTextArea.css("height", "16px");
                        $("#idEditDateZone", editor.$container).show();
                    }
                    else {
                        $("#idEditDateZone", editor.$container).hide();
                        $editTextArea.css("height", "100%");
                    }

                    $ztextStatus.hide();
                    $("#ZTextMultiValued", editor.$container).hide();
                    $("#ZTextMonoValued", editor.$container).show();

                    if (editor.T_fields[meta_struct_id]._status == 2) {
                        // heterogene
                        $editTextArea.val(editor.fieldLastValue = "");
                        $editTextArea.addClass("hetero");
                        $("#idDivButtons", editor.$container).show();	// valeurs h�t�rog�nes : les 3 boutons remplacer/ajouter/annuler
                    }
                    else {
                        // homogene
                        $editTextArea.val(editor.fieldLastValue = editor.T_fields[meta_struct_id]._value);
                        $editTextArea.removeClass("hetero");

                        $("#idDivButtons", editor.$container).hide();	// valeurs homog�nes
                        if (editor.T_fields[meta_struct_id].type == "date") {
                            var v = editor.T_fields[meta_struct_id]._value.split(' ');
                            d = v[0].split('/');
                            var dateObj = new Date();
                            if (d.length == 3) {
                                dateObj.setYear(d[0]);
                                dateObj.setMonth((d[1] - 1));
                                dateObj.setDate(d[2]);
                            }

                            if ($("#idEditDateZone", editor.$container).data("ui-datepicker")) {
                                $("#idEditDateZone", editor.$container).datepicker('setDate', dateObj);
                            }
                        }
                    }
                    editor.textareaIsDirty = false;

                    $("#idEditZone", editor.$container).show();

                    $('#idEditZTextArea').trigger('keyup.maxLength');

                    self.setTimeout("document.getElementById('idEditZTextArea').focus();", 50);
                }
                else {
                    // champ multivalue : liste
                    $ztextStatus.hide();
                    $("#ZTextMonoValued", editor.$container).hide();
                    $("#ZTextMultiValued", editor.$container).show();

                    $("#idDivButtons", editor.$container).hide();	// valeurs homogenes

                    _updateCurrentMval(meta_struct_id);

                    $('#EditTextMultiValued', editor.$container).val("");
                    $('#idEditZone', editor.$container).show();

                    $('#EditTextMultiValued').trigger('keyup.maxLength');

                    self.setTimeout("document.getElementById('EditTextMultiValued').focus();", 50);

    //      reveal_mval();
                }
            }
        }
        else {
            // pas de champ, masquer la zone du textarea
            $("#idEditZone", editor.$container).hide();
            $(".editDiaButtons", editor.$container).hide();

        }
        _activeField();
    }

    function _updateEditSelectedRecords(evt) {
        $(".editDiaButtons", editor.$container).hide();

        for (var n in editor.T_statbits)	// tous les statusbits de la base
        {
            editor.T_statbits[n]._value = "-1";			// val unknown
            for (var i in editor.T_records) {
                if (!editor.T_records[i]._selected)
                    continue;
                if (editor.T_records[i].statbits.length === 0)
                    continue;

                if (editor.T_statbits[n]._value == "-1")
                    editor.T_statbits[n]._value = editor.T_records[i].statbits[n].value;
                else if (editor.T_statbits[n]._value != editor.T_records[i].statbits[n].value)
                    editor.T_statbits[n]._value = "2";
            }
            var ck0 = $("#idCheckboxStatbit0_" + n);
            var ck1 = $("#idCheckboxStatbit1_" + n);

            switch (editor.T_statbits[n]._value) {
                case "0":
                case 0:
                    ck0.removeClass('gui_ckbox_0 gui_ckbox_2').addClass("gui_ckbox_1");
                    ck1.removeClass('gui_ckbox_1 gui_ckbox_2').addClass("gui_ckbox_0");
                    break;
                case "1":
                case 1:
                    ck0.removeClass('gui_ckbox_1 gui_ckbox_2').addClass("gui_ckbox_0");
                    ck1.removeClass('gui_ckbox_0 gui_ckbox_2').addClass("gui_ckbox_1");
                    break;
                case "2":
                    ck0.removeClass('gui_ckbox_0 gui_ckbox_1').addClass("gui_ckbox_2");
                    ck1.removeClass('gui_ckbox_0 gui_ckbox_1').addClass("gui_ckbox_2");
                    break;
            }
        }


        var nostatus = $('.diapo.selected.nostatus', editor.$container).length;
        var status_box = $('#ZTextStatus');
        $('.nostatus, .somestatus, .displaystatus', status_box).hide();

        if (nostatus == 0) {
            $('.displaystatus', status_box).show();
        }
        else {
            var yesstatus = $('.diapo.selected', editor.$container).length;
            if (nostatus == yesstatus) {
                $('.nostatus', status_box).show();
            }
            else {
                $('.somestatus, .displaystatus', status_box).show();
            }
        }

        // calcul des valeurs suggerees COMMUNES aux records (collections) selectionnes //
        for (var f in editor.T_fields)	// tous les champs de la base
            editor.T_fields[f]._sgval = [];
        var t_lsgval = {};
        var t_selcol = {};		// les bases (coll) dont au - une thumb est selectionnee
        var ncolsel = 0;
        var nrecsel = 0;
        for (var i in editor.T_records) {
            if (!editor.T_records[i]._selected)
                continue;
            nrecsel++;

            var bid = "b" + editor.T_records[i].bid;
            if (t_selcol[bid])
                continue;

            t_selcol[bid] = 1;
            ncolsel++;
            for (var f in editor.T_sgval[bid]) {
                if (!t_lsgval[f])
                    t_lsgval[f] = {};
                for (var ivs in editor.T_sgval[bid][f]) {
                    vs = editor.T_sgval[bid][f][ivs];
                    if (!t_lsgval[f][vs])
                        t_lsgval[f][vs] = 0;
                    t_lsgval[f][vs]++;
                }
            }
        }
        var t_sgval = {};
        for (var f in t_lsgval) {
            for (var sv in t_lsgval[f]) {
                if (t_lsgval[f][sv] == ncolsel) {
                    editor.T_fields[f]._sgval.push({
                            label: sv,
                            onclick: function (menuItem, menu, e, label) {
                                if (editor.T_fields[editor.curField].multi) {
                                    $("#EditTextMultiValued", editor.$container).val(label);
                                    $('#EditTextMultiValued').trigger('keyup.maxLength');
                                    _addMultivaluedField($('#EditTextMultiValued', editor.$container).val(), null);
                                }
                                else {
                                    if (utilsModule.is_ctrl_key(e)) {
                                        var t = $editTextArea.val();
                                        $editTextArea.val(t + (t ? " ; " : "") + label);
                                    }
                                    else {
                                        $editTextArea.val(label);
                                    }
                                    $('#idEditZTextArea').trigger('keyup.maxLength');
                                    editor.textareaIsDirty = true;
                                    if (editor.T_fields[editor.curField]._status != 2)
                                        edit_validField(evt, "ask_ok");
                                }
                            }
                        }
                    );
                }
            }
            if (editor.T_fields[f]._sgval.length > 0) {
                $("#editSGtri_" + f, editor.$container).css("visibility", "visible");
                $("#editSGtri_" + f, editor.$container).unbind();
                $("#editSGtri_" + f, editor.$container).contextMenu(
                    editor.T_fields[f]._sgval,
                    {
                        theme: 'vista',
                        openEvt: "click",
                        beforeShow: function (a, b, c, d) {
                            var fid = this.target.getAttribute('id').substr(10);
                            if (!editor.textareaIsDirty || edit_validField(null, "ask_ok") == true) {
                                _editField(null, fid);
                                return(true);
                            }
                            else {
                                return(false);
                            }
                        }
                    }
                );
            }
            else {
                $("#editSGtri_" + f, editor.$container).css("visibility", "hidden");
            }
        }

        //$('#idFrameE .ww_status', editor.$container).html(nrecsel + " record(s) selected for editing");

        _updateFieldDisplay();

        if (editor.curField == -1)
            _editStatus(evt);
        else
            _editField(evt, editor.curField);
    }

    function _updateFieldDisplay() {
        for (var f in editor.T_fields)	// tous les champs de la base
        {
            editor.T_fields[f]._status = 0;			// val unknown
            for (var i in editor.T_records) {
                if (!editor.T_records[i]._selected)
                    continue;


                if (editor.T_records[i].fields[f].isEmpty()) {
                    var v = "";
                }
                else {
                    // le champ existe dans la fiche
                    if (editor.T_fields[f].multi) {
                        // champ multi : on compare la concat des valeurs
                        var v = editor.T_records[i].fields[f].getSerializedValues()
                    }
                    else {
                        var v = editor.T_records[i].fields[f].getValue().getValue();
                    }
                }

                if (editor.T_fields[f]._status == 0) {
                    editor.T_fields[f]._value = v;
                    editor.T_fields[f]._status = 1;
                }
                else if (editor.T_fields[f]._status == 1 && editor.T_fields[f]._value != v) {
                    editor.T_fields[f]._value = "*****";
                    editor.T_fields[f]._status = 2;
                    break;	// plus la peine de verifier le champ sur les autres records
                }
            }
            var o = document.getElementById("idEditField_" + f);

            if (o) {
                if (editor.T_fields[f]._status == 2)	// mixed
                    o.innerHTML = "<span class='hetero'>xxxxx</span>";
                else {
                    var v = editor.T_fields[f]._value;
                    v = (v instanceof(Array)) ? v.join(";") : v;
                    o.innerHTML = _cleanTags(v).replace(/\n/gm, "<span style='color:#0080ff'>&para;</span><br/>");
                }
            }
        }
    }
    // ---------------------------------------------------------------------------
// on active le pseudo champ 'status'
// ---------------------------------------------------------------------------
    function _editStatus(evt) {
        $(".editDiaButtons", editor.$container).hide();

        document.getElementById('idEditZTextArea').blur();
        document.getElementById('EditTextMultiValued').blur();

        $("#idFieldNameEdit", editor.$container).html("[STATUS]");
        $("#idExplain", editor.$container).html("&nbsp;");

        $("#ZTextMultiValued", editor.$container).hide();
        $("#ZTextMonoValued", editor.$container).hide();
        $ztextStatus.show();

        $("#idEditZone", editor.$container).show();

        document.getElementById("editFakefocus").focus();
        editor.curField = -1;
        _activeField();
    }

    function _updateCurrentMval(meta_struct_id, HighlightValue, vocabularyId) {

        // on compare toutes les valeurs de chaque fiche selectionnee
        editor.T_mval = [];			// tab des mots, pour trier
        var a = [];		// key : mot ; val : nbr d'occurences distinctes
        var n = 0;					// le nbr de records selectionnes

        for (var r in editor.T_records) {
            if (!editor.T_records[r]._selected)
                continue;

            editor.T_records[r].fields[meta_struct_id].sort(_sortCompareMetas);

            var values = editor.T_records[r].fields[meta_struct_id].getValues();

            for (var v in values) {
                var word = values[v].getValue();
                var key = values[v].getVocabularyId() + '%' + word;

                if (typeof(a[key]) == 'undefined') {
                    a[key] = {
                        'n': 0,
                        'f': new Array()
                    };	// n:nbr d'occurences DISTINCTES du mot ; f:flag presence mot dans r
                    editor.T_mval.push(values[v]);
                }

                if (!a[key].f[r])
                    a[key].n++;		// premiere apparition du mot dans le record r
                a[key].f[r] = true;	// on ne recomptera pas le mot s'il apparait a nouveau dans le meme record

            }

            n++;
        }

        editor.T_mval.sort(_sortCompareMetas);

        var t = "";
        for (var i in editor.T_mval)	// pour lire le tableau 'a' dans l'ordre trie par 'editor.T_mval'
        {
            var value = editor.T_mval[i];
            var word = value.getValue();
            var key = value.getVocabularyId() + '%' + word;

            var extra = value.getVocabularyId() ? '<img src="/assets/common/images/icons/ressource16.png" /> ' : '';

            if (i > 0) {
                if (value.getVocabularyId() !== null && editor.T_mval[i - 1].getVocabularyId() == value.getVocabularyId()) {
                    continue;
                }
                if (value.getVocabularyId() === null && editor.T_mval[i - 1].getVocabularyId() === null) {
                    if (editor.T_mval[i - 1].getValue() == value.getValue()) {
                        continue;	// on n'accepte pas les doublons
                    }
                }
            }

            t += '<div data-index="' + i + '" class="edit-multivalued-field-action '
                + (((value.getVocabularyId() === null || value.getVocabularyId() == vocabularyId) && HighlightValue == word) ? ' hilighted ' : '')
                + (a[key].n != n ? ' hetero ' : '') + '">'
                + '<table><tr><td>'
                + extra
                + '<span class="value" vocabId="' + (value.getVocabularyId() ? value.getVocabularyId() : '') + '">'
                + $('<div/>').text(word).html()
                + "</span></td><td class='options'>"
                + '<a href="#" class="add_all"><img src="/assets/common/images/icons/plus11.png"/></a> '
                + '<a href="#" class="remove_all"><img src="/assets/common/images/icons/minus11.png"/></a>'
                + "</td></tr></table>"
                + "</div>";
        }
        $('#ZTextMultiValued_values', editor.$container).html(t);

        $('#ZTextMultiValued_values .add_all', editor.$container).unbind('click').bind('click', function () {
            var container = $(this).closest('div');

            var span = $('span.value', container)

            var value = span.text();
            var vocab_id = span.attr('vocabid');

            _addMultivaluedField(value, vocab_id);
            _updateFieldDisplay();
            return false;
        });
        $('#ZTextMultiValued_values .remove_all', editor.$container).unbind('click').bind('click', function () {
            var container = $(this).closest('div');

            var span = $('span.value', container)

            var value = span.text();
            var vocab_id = span.attr('vocabid');

            _edit_delmval(value, vocab_id);
            _updateFieldDisplay();
            return false;
        });

        _updateFieldDisplay();
    }

    // ---------------------------------------------------------------------------------------------------------
// en mode textarea, on clique sur ok, cancel ou fusion
// appele egalement quand on essaye de changer de champ ou d'image : si ret=false on interdit le changement
// ---------------------------------------------------------------------------------------------------------
    function edit_validField(evt, action) {
        // action : 'ok', 'fusion' ou 'cancel'
        if (editor.curField == "?")
            return(true);

        if (action == "cancel") {
            // on restore le contenu du champ
            $editTextArea.val(editor.fieldLastValue);
            $('#idEditZTextArea').trigger('keyup.maxLength');
            editor.textareaIsDirty = false;
            return(true);
        }

        if (action == "ask_ok" && editor.textareaIsDirty && editor.T_fields[editor.curField]._status == 2) {
            alert(localeService.t('edit_hetero'));
            return(false);
        }
        var o, newvalue;
        if (o = document.getElementById("idEditField_" + editor.curField)) {
            console.log('should find value',  $editTextArea, $editTextArea.val())
            let t = $editTextArea.val();

            let status = 0;
            let firstvalue = "";
            for (var i = 0; i < editor.T_records.length; i++) {
                if (!editor.T_records[i]._selected)
                    continue;			// on ne modifie pas les fiches non selectionnees

                if (action == "ok" || action == "ask_ok") {
                    editor.T_records[i].fields[editor.curField].addValue(t, false, null);
                }
                else if (action == "fusion" || action == "ask_fusion") {
                    editor.T_records[i].fields[editor.curField].addValue(t, true, null);
                }

                _check_required(i, editor.curField);
            }
        }

        _updateFieldDisplay();

        editor.textareaIsDirty = false;


        _editField(evt, editor.curField);
        return(true);
    }

    // ---------------------------------------------------------------------------
// on a clique sur une checkbox de status
// ---------------------------------------------------------------------------
    function edit_clkstatus(evt, bit, val) {
        var ck0 = $("#idCheckboxStatbit0_" + bit);
        var ck1 = $("#idCheckboxStatbit1_" + bit);
        switch (val) {
            case 0:
                ck0.attr('class', "gui_ckbox_1");
                ck1.attr('class', "gui_ckbox_0");
                break;
            case 1:
                ck0.attr('class', "gui_ckbox_0");
                ck1.attr('class', "gui_ckbox_1");
                break;
        }

        for (var id in editor.T_records) {
            if (editor.T_records[id]._selected)	// toutes les fiches selectionnees
            {
                if ($('#idEditDiapo_' + id).hasClass('nostatus'))
                    continue;

                editor.T_records[id].statbits[bit].value = val;
                editor.T_records[id].statbits[bit].dirty = true;
            }
        }
    }

    // ---------------------------------------------------------------------------
// on a clique sur une thumbnail
// ---------------------------------------------------------------------------
    function _onSelectRecord(evt, i) {
        if (editor.curField >= 0) {
            if (editor.textareaIsDirty && edit_validField(evt, "ask_ok") == false)
                return;
        }

        // guideline : si on mousedown sur une selection, c'est qu'on risque de draguer, donc on ne desectionne pas
        if (evt && evt.type == "mousedown" && editor.T_records[i]._selected)
            return;

        if (evt && utilsModule.is_shift_key(evt) && editor.lastClickId != null) {
            // shift donc on sel du editor.lastClickId a ici
            var pos_from = editor.T_pos[editor.lastClickId];
            var pos_to = editor.T_pos[i];
            if (pos_from > pos_to) {
                var tmp = pos_from;
                pos_from = pos_to;
                pos_to = tmp;
            }

            for (var pos = pos_from; pos <= pos_to; pos++) {
                var id = editor.T_id[pos];
                if (!editor.T_records[id]._selected)	// toutes les fiches selectionnees
                {
                    editor.T_records[id]._selected = true;
                    $("#idEditDiapo_" + id, editor.$container).addClass('selected');
                }
            }
        }
        else {
            if (!evt || !utilsModule.is_ctrl_key(evt)) {
                // on deselectionne tout avant

                for (var id in editor.T_records) {
                    if (editor.T_records[id]._selected)	// toutes les fiches selectionnees
                    {
                        editor.T_records[id]._selected = false;
                        $("#idEditDiapo_" + id, editor.$container).removeClass('selected');
                    }
                }
            }
            if (i >= 0) {
                editor.T_records[i]._selected = !editor.T_records[i]._selected;
                if (editor.T_records[i]._selected)
                    $("#idEditDiapo_" + i, editor.$container).addClass('selected');
                else
                    $("#idEditDiapo_" + i, editor.$container).removeClass('selected');
            }
        }

        $('#TH_Opreview .PNB10').empty();

        var selected = $('#EDIT_FILM2 .diapo.selected');
        if (selected.length == 1) {

            var r = selected.attr('id').split('_').pop();
            _previewEdit(r);
        }

        editor.lastClickId = i;
        _updateEditSelectedRecords(evt);
    }

    // ----------------------------------------------------------------------------------
// on a clique sur le 'ok' general : save
// ----------------------------------------------------------------------------------
    function edit_applyMultiDesc(evt) {
        var sendorder = "";
        var sendChuOrder = "";

        var t = [];

        if (editor.textareaIsDirty && edit_validField(evt, "ask_ok") == false)
            return(false);

        var required_fields = _check_required();

        if (required_fields) {
            alert(localeService.t('some_required_fields'));
            return;
        }

        $("#EDIT_ALL", editor.$container).hide();

        $("#EDIT_WORKING", editor.$container).show();

        for (var r in editor.T_records) {
            var record_datas = {
                record_id: editor.T_records[r].rid,
                metadatas: [],
                edit: 0,
                status: null
            };

            var editDirty = false;

            for (var f in editor.T_records[r].fields) {
                if (!editor.T_records[r].fields[f].isDirty()) {
                    continue;
                }

                editDirty = true;
                record_datas.edit = 1;

                record_datas.metadatas = record_datas.metadatas.concat(
                    editor.T_records[r].fields[f].exportDatas()
                );
            }

            // les statbits
            var tsb = [];
            for (var n = 0; n < 64; n++)
                tsb[n] = 'x';
            var sb_dirty = false;
            for (var n in editor.T_records[r].statbits) {
                if (editor.T_records[r].statbits[n].dirty) {
                    tsb[63 - n] = editor.T_records[r].statbits[n].value;
                    sb_dirty = true;
                }
            }

            if (sb_dirty || editDirty) {
                if (sb_dirty === true)
                    record_datas.status = tsb.join("");

                t.push(record_datas);
            }
        }

        var options = {
            mds: t,
            sbid: editor.sbas_id,
            act: 'WORK',
            lst: $('#edit_lst').val(),
            act_option: 'SAVE' + editor.what,
            //regbasprid: editor.regbasprid,
            ssel: editor.ssel
        };
        if (editor.newrepresent != false)
            options.newrepresent = editor.newrepresent;

        $.ajax({
            url: "../prod/records/edit/apply/",
            data: options
            //    ,dataType:'json'
            ,
            type: 'POST',
            success: function (data) {
                if (editor.what == 'GRP' || editor.what == 'SSEL') {
                    p4.WorkZone.refresh('current');
                }
                $("#Edit_copyPreset_dlg").remove();
                $('#EDITWINDOW').hide();
                commonModule.hideOverlay(2);
                appEvents.emit('preview.doReload');
                return;
            }
        });

    }

    function edit_cancelMultiDesc(evt) {


        var dirty = false;

        evt.cancelBubble = true;
        if (evt.stopPropagation)
            evt.stopPropagation();

        if (editor.curField >= 0) {
            if (editor.textareaIsDirty && edit_validField(evt, "ask_ok") == false)
                return;
        }

        for (var r in editor.T_records) {
            for (var f in editor.T_records[r].fields) {
                if ((dirty |= editor.T_records[r].fields[f].isDirty()))
                    break;
            }
            for (var n in editor.T_records[r].statbits) {
                if ((dirty |= editor.T_records[r].statbits[n].dirty))
                    break;
            }
        }
        if (!dirty || confirm(localeService.t('confirm_abandon'))) {
            $("#Edit_copyPreset_dlg").remove();
            $('#idFrameE .ww_content', editor.$container).empty();

            // on reaffiche tous les thesaurus
            for (var i in p4.thesau.thlist)	// tous les thesaurus
            {
                var bid = p4.thesau.thlist[i].sbas_id;
                var e = document.getElementById('TH_T.' + bid + '.T');
                if (e)
                    e.style.display = "";
            }
            self.setTimeout("$('#EDITWINDOW').fadeOut();commonModule.hideOverlay(2);", 100);

        }
    }

    function _EditThesaurusSeeker(sbas_id) {
        this.jq = null;

        this.sbas_id = sbas_id;

        var zid = ("" + sbas_id).replace(new RegExp("\\.", "g"), "\\.") + "\\.T";

        this.TH_P_node = $("#TH_P\\." + zid, editor.$container);
        this.TH_K_node = $("#TH_K\\." + zid, editor.$container);

        this._ctimer = null;

        this.search = function (txt) {
            if (this._ctimer)
                clearTimeout(this._ctimer);
            var js = "ETHSeeker.search_delayed('" + txt.replace("'", "\\'") + "');";
            this._ctimer = setTimeout(js, 125);
        };

        this.search_delayed = function (txt) {
            if (this.jq && typeof this.jq.abort == "function") {
                this.jq.abort();
                this.jq = null;
            }
            txt = txt.replace("'", "\\'");
            var url = "/xmlhttp/openbranches_prod.h.php";
            var parms = {
                bid: this.sbas_id,
                lng: p4.lng,
                t: txt,
                mod: "TREE",
                u: Math.random()
            };

            var me = this;

            this.jq = $.ajax({
                url: url,
                data: parms,
                type: 'POST',
                success: function (ret) {
                    me.TH_P_node.html("...");
                    me.TH_K_node.attr("class", "h").html(ret);
                    me.jq = null;
                },
                error: function () {

                },
                timeout: function () {

                }
            });
        };

        this.openBranch = function (id, thid) {
            if (this.jq) {
                this.jq.abort();
                this.jq = null;
            }
            var url = "/xmlhttp/getterm_prod.h.php";
            var parms = {
                bid: this.sbas_id,
                lng: p4.lng,
                sortsy: 1,
                id: thid,
                typ: "TH"
            };
            var me = this;


            this.jq = $.ajax({
                url: url,
                data: parms,
                success: function (ret) {
                    var zid = "#TH_K\\." + id.replace(new RegExp("\\.", "g"), "\\.");	// escape les '.' pour jquery
                    $(zid, editor.$container).html(ret);
                    me.jq = null;
                },
                error: function () {

                },
                timeout: function () {

                }
            });
        };
    }

    function edit_clickThesaurus(event)	// onclick dans le thesaurus
    {
        // on cherche ou on a clique
        for (e = event.srcElement ? event.srcElement : event.target; e && ((!e.tagName) || (!e.id)); e = e.parentNode)
            ;
        if (e) {
            switch (e.id.substr(0, 4)) {
                case "TH_P":	// +/- de deploiement de mot
                    js = "recordEditorModule.edit_thesaurus_ow('" + e.id.substr(5) + "')";
                    self.setTimeout(js, 10);
                    break;
            }
        }
        return(false);
    }

    function edit_dblclickThesaurus(event)	// ondblclick dans le thesaurus
    {
        for (e = event.srcElement ? event.srcElement : event.target; e && ((!e.tagName) || (!e.id)); e = e.parentNode)
            ;
        if (e) {
            switch (e.id.substr(0, 4)) {
                case "TH_W":
                    if (editor.curField >= 0) {
                        var w = $(e).text();
                        if (editor.T_fields[editor.curField].multi) {
                            $("#EditTextMultiValued", editor.$container).val(w);
                            $('#EditTextMultiValued').trigger('keyup.maxLength');
                            _addMultivaluedField($('#EditTextMultiValued', editor.$container).val(), null);
                        }
                        else {
                            $editTextArea.val(w);
                            $('#idEditZTextArea').trigger('keyup.maxLength');
                            editor.textareaIsDirty = true;
                        }
                    }
                    break;
            }
        }
        return(false);
    }

    function edit_thesaurus_ow(id)	// on ouvre ou ferme une branche de thesaurus
    {
        var o = document.getElementById("TH_K." + id);
        if (o.className == "o") {
            // on ferme
            o.className = "c";
            document.getElementById("TH_P." + id).innerHTML = "+";
            document.getElementById("TH_K." + id).innerHTML = localeService.t('loading');
        }
        else if (o.className == "c" || o.className == "h") {
            // on ouvre
            o.className = "o";
            document.getElementById("TH_P." + id).innerHTML = "-";

            var t_id = id.split(".");
            var sbas_id = t_id[0];
            t_id.shift();
            var thid = t_id.join(".");
            var url = "/xmlhttp/getterm_prod.x.php";
            var parms = "bid=" + sbas_id;
            parms += "&lng=" + p4.lng;
            parms += "&sortsy=1";
            parms += "&id=" + thid;
            parms += "&typ=TH";

            ETHSeeker.openBranch(id, thid);
        }
        return(false);
    }




    function _toggleReplaceMode(ckRegExp) {


        if (ckRegExp.checked) {
            $("#EditSR_TX", editor.$container).hide();
            $("#EditSR_RX", editor.$container).show();
        }
        else {
            $("#EditSR_RX", editor.$container).hide();
            $("#EditSR_TX", editor.$container).show();
        }
    }

    function _setSizeLimits() {
        if (!$('#EDITWINDOW').is(':visible'))
            return;

        if ($('#EDIT_TOP').data("ui-resizable")) {
            $('#EDIT_TOP').resizable('option', 'maxHeight', ($('#EDIT_ALL').height() - $('#buttonEditing').height() - 10 - 160));
        }
        if ($('#divS_wrapper').data("ui-resizable")) {
            $('#divS_wrapper').resizable('option', 'maxWidth', ($('#EDIT_MID_L').width() - 270));
        }
        if ($('#EDIT_MID_R').data("ui-resizable")) {
            $('#EDIT_MID_R').resizable('option', 'maxWidth', ($('#EDIT_MID_R').width() + $('#idEditZone').width() - 240));
        }
    }

    function _hsplit1() {
        var el = $('#EDIT_TOP');
        if (el.length == 0)
            return;
        var h = $(el).outerHeight();
        $(el).height(h);
        var t = $(el).offset().top + h;

        $("#EDIT_MID", editor.$container).css("top", (t) + "px");
    }
    function _vsplit1() {
        $('#divS_wrapper').height('auto');

        var el = $('#divS_wrapper');
        if (el.length == 0)
            return;
        var a = $(el).width();
        el.width(a);

        $("#idEditZone", editor.$container).css("left", (a + 20 ));
    }
    function _vsplit2() {
        var el = $('#EDIT_MID_R');
        if (el.length == 0)
            return;
        var a = $(el).width();
        el.width(a);
        var v = $('#EDIT_ALL').width() - a - 20;

        $("#EDIT_MID_L", editor.$container).width(v);
    }

    function _activeField() {
        var meta_struct_id = parseInt(editor.curField);

        meta_struct_id = (isNaN(meta_struct_id) || meta_struct_id < 0) ? 'status' : meta_struct_id;

        $('#divS div.active, #divS div.hover').removeClass('active hover');
        $('#EditFieldBox_' + meta_struct_id).addClass('active');

        var cont = $('#divS');
        var calc = $('#EditFieldBox_' + meta_struct_id).offset().top - cont.offset().top;// hauteur relative par rapport au visible

        if (calc > cont.height() || calc < 0) {
            cont.scrollTop(calc + cont.scrollTop());
        }
    }
    function _sortCompareMetas(a, b) {
        if (typeof(a) != 'object')
            return(-1);
        if (typeof(b) != 'object')
            return(1);
        var na = a.getValue().toUpperCase();
        var nb = b.getValue().toUpperCase();
        if (na == nb)
            return(0);
        return(na < nb ? -1 : 1);
    }

    //---------------------------------------------------------------------
//nettoie
//---------------------------------------------------------------------
    function _cleanTags(string) {
        var chars2replace = [
            {
                f: "&",
                t: "&amp;"
            },
            {
                'f': "<",
                't': "&lt;"
            },
            {
                'f': ">",
                't': "&gt;"
            }
        ];
        for (var c in chars2replace)
            string = string.replace(RegExp(chars2replace[c].f, "g"), chars2replace[c].t);
        return string;
    }

    function _check_required(id_r, id_f) {
        var required_fields = false;

        if (typeof id_r == 'undefined')
            id_r = false;
        if (typeof id_f == 'undefined')
            id_f = false;

        for (var f in editor.T_fields) {
            if (id_f !== false && f != id_f)
                continue;

            var name = editor.T_fields[f].name;

            if (!editor.T_fields[f].required)
                continue;

            for (var r in editor.T_records) {
                if (id_r !== false && r != id_r)
                    continue;

                var elem = $('#idEditDiapo_' + r + ' .require_alert');

                elem.hide();

                if (!editor.T_records[r].fields[f]) {
                    elem.show();
                    required_fields = true;
                }
                else {

                    var check_required = '';

                    // le champ existe dans la fiche
                    if (editor.T_fields[f].multi) {
                        // champ multi : on compare la concat des valeurs
                        check_required = $.trim(editor.T_records[r].fields[f].getSerializedValues())
                    }
                    else if (editor.T_records[r].fields[f].getValue()) {
                        check_required = $.trim(editor.T_records[r].fields[f].getValue().getValue());
                    }


                    if (check_required == '') {
                        elem.show();
                        required_fields = true;
                    }
                }
            }

        }
        return required_fields;
    }


    function _edit_select_all() {
        $('#EDIT_FILM2 .diapo', editor.$container).addClass('selected');

        for (var i in editor.T_records)
            editor.T_records[i]._selected = true;

        editor.lastClickId = 1;

        _updateEditSelectedRecords(null);		// null : no evt available
    }
    // ---------------------------------------------------------------------------
// highlight la valeur en cours de saisie dans la liste des multi-valeurs
// appele par le onkeyup
// ---------------------------------------------------------------------------
    function _reveal_mval(value, vocabularyId) {
        if (typeof vocabularyId === 'undefined')
            vocabularyId = null;

        var textZone = $('#EditTextMultiValued');

        if (editor.T_fields[editor.curField].tbranch) {
            if (value != "")
                ETHSeeker.search(value);
        }

        if (value != "") {
            //		var nsel = 0;
            for (var rec_i in editor.T_records) {
                if (editor.T_records[rec_i].fields[editor.curField].hasValue(value, vocabularyId)) {
                    $("#idEditDiaButtonsP_" + rec_i).hide();
                    var talt = $.sprintf(localeService.t('editDelSimple'), value);
                    $("#idEditDiaButtonsM_" + rec_i).show()
                        .attr('alt', talt)
                        .attr('Title', talt)
                        .unbind('click').bind('click', function () {
                        var indice = $(this).attr('id').split('_').pop();
                        _edit_diabutton(indice, 'del', value, vocabularyId);
                    });
                }
                else {
                    $("#idEditDiaButtonsM_" + rec_i).hide();
                    $("#idEditDiaButtonsP_" + rec_i).show();
                    var talt = $.sprintf(localeService.t('editAddSimple'), value);
                    $("#idEditDiaButtonsP_" + rec_i).show().attr('alt', talt)
                        .attr('Title', talt)
                        .unbind('click').bind('click', function () {
                        var indice = $(this).attr('id').split('_').pop();
                        _edit_diabutton(indice, 'add', value, vocabularyId);
                    });
                }
            }
            $(".editDiaButtons", editor.$container).show();
        }

        textZone.trigger('focus');
        return(true);
    }

    // ---------------------------------------------------------------------------
// on a clique sur le bouton 'supprimer' un mot dans le multi-val
// ---------------------------------------------------------------------------
    function _edit_delmval(value, VocabularyId) {
        var meta_struct_id = editor.curField;		// le champ en cours d'editing

        for (var r = 0; r < editor.T_records.length; r++) {
            if (!editor.T_records[r]._selected)
                continue;

            editor.T_records[r].fields[meta_struct_id].removeValue(value, VocabularyId);
        }

        _updateEditSelectedRecords(null);
    }

    // ---------------------------------------------------------------------------
// on a clique sur le bouton 'ajouter' un mot dans le multi-val
// ---------------------------------------------------------------------------
    function _addMultivaluedField(value, VocabularyId) {
        var meta_struct_id = editor.curField;		// le champ en cours d'editing

        // on ajoute le mot dans tous les records selectionnes
        for (var r = 0; r < editor.T_records.length; r++) {
            if (!editor.T_records[r]._selected)
                continue;

            editor.T_records[r].fields[meta_struct_id].addValue(value, false, VocabularyId);
        }

        _updateEditSelectedRecords(null);
    }

    // ---------------------------------------------------------------------------
    // on a clique sur une des multi-valeurs dans la liste
    // ---------------------------------------------------------------------------
    function _editMultivaluedField(mvaldiv, ival) {
        $(mvaldiv).parent().find('.hilighted').removeClass('hilighted');
        $(mvaldiv).addClass('hilighted');
        _reveal_mval(editor.T_mval[ival].getValue(), editor.T_mval[ival].getVocabularyId());
    }

    function _edit_diabutton(record_indice, act, value, vocabularyId) {
        var meta_struct_id = editor.curField;		// le champ en cours d'editing
        if (act == 'del') {
            editor.T_records[record_indice].fields[meta_struct_id].removeValue(value, vocabularyId);
        }

        if (act == 'add') {
            editor.T_records[record_indice].fields[meta_struct_id].addValue(value, false, vocabularyId);
        }
        _updateCurrentMval(meta_struct_id, value, vocabularyId);
        _reveal_mval(value, vocabularyId);

    }

    // ---------------------------------------------------------------------------
// change de champ (avec les fleches autour du nom champ)
// ---------------------------------------------------------------------------
    // edit_chgFld
    function fieldNavigate(evt, dir) {
        var current_field = $('#divS .edit_field.active');
        if (current_field.length == 0) {
            current_field = $('#divS .edit_field:first');
            current_field.trigger('click');
        }
        else {
            if (dir >= 0) {
                current_field.next().trigger('click');
            }
            else {
                current_field.prev().trigger('click');
            }
        }
    }



    // ---------------------------------------------------------------------------
// on a clique sur le peudo champ 'status'
// ---------------------------------------------------------------------------
    /*function edit_mdwn_status(evt) {
        if (!editor.textareaIsDirty || edit_validField(evt, "ask_ok") == true)
            _editStatus(evt);
        evt.cancelBubble = true;
        if (evt.stopPropagation)
            evt.stopPropagation();
        return(false);
    }*/



    function _onTextareaKeyDown(event) {
        let $el = $(event.currentTarget);
        let cancelKey = false;

        switch (event.keyCode) {
            case 13:
            case 10:
                if (editor.T_fields[editor.curField].type == "date")
                    cancelKey = true;
        }

        if (cancelKey) {
            event.cancelBubble = true;
            if (event.stopPropagation)
                event.stopPropagation();
            return(false);
        }
        return(true);
    }

    // ----------------------------------------------------------------------------------------------
// des events sur le textarea pour tracker la selection (chercher dans le thesaurus...)
// ----------------------------------------------------------------------------------------------
    function _onTextareaMouseDown(evt) {
        evt.cancelBubble = true;
        return(true);
    }

    // mouse up textarea
    function _onTextareaMouseUp(event, obj) {
        let $el = $(event.currentTarget);
        let value = $el.val();
        console.log('has valeu?', value)
        console.log('curfield?', editor.curField)
        console.log('t_field?', editor.T_fields)
        if (editor.T_fields[editor.curField].tbranch) {
            if (value != "")
                ETHSeeker.search(value);
        }
        return(true);
    }

    // key up textarea
    function _onTextareaKeyUp(event, obj) {
        let $el = $(event.currentTarget);
        var cancelKey = false;
        var o;
        switch (event.keyCode) {
            case 27:	// esc : on restore la valeur avant editing
                //			$("#btn_cancel", editor.$container).parent().css("backgroundColor", "#000000");
                edit_validField(event, "cancel");
                //			self.setTimeout("document.getElementById('btn_cancel').parentNode.style.backgroundColor = '';", 100);
                cancelKey = true;
                break;
        }

        if (cancelKey) {
            event.cancelBubble = true;
            if (event.stopPropagation)
                event.stopPropagation();
            return(false);
        }
        if (!editor.textareaIsDirty && ($editTextArea.val() != editor.fieldLastValue)) {
            editor.textareaIsDirty = true;
        }

        var s = $el.val(); //obj.value;
        if (editor.T_fields[editor.curField].tbranch) {
            if (s != "")
                ETHSeeker.search(s);
        }
        return(true);
    }

    appEvents.listenAll({
        'recordEditor.start': startThisEditing
    })


    return {
        initialize: initialize,
        startThisEditing: startThisEditing,
        setRegDefault: setRegDefault,
        skipImage: skipImage,
        edit_clkstatus: edit_clkstatus,
        edit_validField: edit_validField,
        edit_applyMultiDesc: edit_applyMultiDesc,
        edit_cancelMultiDesc: edit_cancelMultiDesc,
        edit_clickThesaurus: edit_clickThesaurus,
        edit_dblclickThesaurus: edit_dblclickThesaurus,
        edit_thesaurus_ow: edit_thesaurus_ow
    };
};
export default recordEditor;
