import React from 'react'
import { findDOMNode } from 'react-dom'
import Component from 'react-class'
import assign from 'object-assign'
import { Flex, Item } from 'react-flex'
import Input from 'react-field'
import InlineBlock from 'react-inline-block'

import moment from 'moment'
import join from './join'
import toMoment from './toMoment'

const getPicker = (props) => {
  return React.Children.toArray(props.children).filter(c => c && c.props && c.props.isDatePicker)[0]
}

const ARROW_KEYS = {
  ArrowUp: 1,
  ArrowDown: 1,
  ArrowLeft: 1,
  ArrowRight: 1
}

const CLEAR_ICON = <svg height="20" width="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
  <path d="M0 0h24v24H0z" fill="none"/>
</svg>

const joinFunctions = (a, b) => {
  if (a && b){
    return (...args) => {
      a(...args)
      b(...args)
    }
  }

  return a? a: b
}

const preventDefault = (event) => {
  event.preventDefault()
}

export default class DateField extends Component {

  constructor(props){
    super(props)

    this.state = {
      value: props.defaultValue === undefined? '': props.defaultValue,

      expanded: props.defaultExpanded || false,
      focused: false
    }
  }

  render(){
    const props = this.prepareProps(this.props)

    const tabIndex = this.isFocused()? -1: (this.props.tabIndex || 0)

    return <Flex
      inline
      row
      wrap={false}
      value={null}
      date={null}
      text={null}
      {...props}
    >
      {this.renderInput()}
      {this.renderClearIcon()}
      {this.renderCalendarIcon()}

      {this.renderPicker()}
    </Flex>
  }

  renderInput(){
    const props = this.p
    const inputProps = this.prepareInputProps(props)

    let input

    if (props.renderInput){
      input = props.renderInput(inputProps)
    }

    if (input === undefined){
      input = <Input {...inputProps} />
    }

    return input
  }

  renderClearIcon(){
    const props = this.p

    if (!props.clearIcon){
      return
    }

    const clearIcon = props.clearIcon === true?
                        CLEAR_ICON:
                        props.clearIcon

    const clearIconProps = {
      style: {
        visibility: props.text? 'visible': 'hidden'
      },
      className: 'react-date-field__clear-icon',
      onMouseDown: this.onClearMouseDown,
      children: clearIcon
    }

    let result

    if (props.renderClearIcon){
      result = props.renderClearIcon(clearIconProps)
    }

    if (result === undefined){
      result = <InlineBlock {...clearIconProps} />
    }

    return result
  }

  onClearMouseDown(event){
    event.preventDefault()
    this.onFieldChange('')

    if (!this.isFocused()){
      this.focus()
    }
  }

  renderCalendarIcon(){
    let result
    const renderIcon = this.props.renderCalendarIcon

    const calendarIconProps = {
      className: 'react-date-field__calendar-icon',
      onMouseDown: this.onCalendarIconMouseDown,
      children: <div className="react-date-field__calendar-icon-inner" />
    }

    if(renderIcon){
      result = renderIcon(calendarIconProps)
    }

    if(result === undefined){
      result = <div  {...calendarIconProps} />
    }

    return result
  }

  onCalendarIconMouseDown(event){

    event.preventDefault()

    if (!this.isFocused()){
      this.focus()
    }

    this.toggleExpand()
  }

  prepareExpanded(props){
    return props.expanded === undefined?
                      this.state.expanded:
                      props.expanded
  }

  prepareDate(props, pickerProps){
    props = props || this.p
    pickerProps = pickerProps || props.pickerProps

    const locale = props.locale || pickerProps.locale
    const dateFormat = props.dateFormat || pickerProps.dateFormat
    const strict = props.strict

    let value = props.value === undefined?
                  this.state.value:
                  props.value

    const date = this.toMoment(value)
    const valid = date.isValid()

    if (value && typeof value != 'string' && valid){
      value = this.format(date)
    }

    if (date && valid){
      this.lastValidDate = date
    } else {
      value = this.state.value
    }

    const viewDate = this.state.viewDate || this.lastValidDate || new Date()
    const activeDate = this.state.activeDate || this.lastValidDate || new Date()

    return {
      viewDate,
      activeDate,
      dateFormat,
      locale,
      valid,
      date,
      value
    }
  }

  preparePickerProps(props){
    const picker = getPicker(props)

    if (!picker){
      return null
    }

    return picker.props || {}
  }

  prepareProps(thisProps){
    const props = this.p = assign({}, thisProps)

    props.children = React.Children.toArray(props.children)

    props.expanded = this.prepareExpanded(props)
    props.pickerProps = this.preparePickerProps(props)

    const dateInfo = this.prepareDate(props, props.pickerProps)

    assign(props, dateInfo)

    if (props.text === undefined){
      props.text = this.state.text

      if (props.text == null){
        props.text = props.valid && props.date?
              props.value:
              this.props.value
      }
    }

    if (props.text === undefined){
      props.text = ''
    }

    props.className = this.prepareClassName(props)

    return props
  }

  prepareClassName(props){
    return join([
      'react-date-field',
      props.className,

      props.theme && `react-date-field--theme-${props.theme}`,

      this.isFocused() && join(
        'react-date-field--focused',
        props.focusedClassName
      ),

      this.isExpanded() && join(
        'react-date-field--expanded',
        props.expandedClassName
      ),

      !props.valid && join(props.invalidClassName, 'react-date-field--invalid')
    ])

  }

  prepareInputProps(props){

    const input = props.children.filter(c => c && c.type === 'input')[0]
    const inputProps = (input && input.props) || {}

    const onBlur = joinFunctions(inputProps.onBlur, this.onFieldBlur)
    const onFocus = joinFunctions(inputProps.onFocus, this.onFieldFocus)
    const onChange = joinFunctions(inputProps.onChange, this.onFieldChange)
    const onKeyDown = joinFunctions(inputProps.onKeyDown, this.onFieldKeyDown)

    const newInputProps = assign({}, inputProps, {

      ref: (f) => this.field = f,
      date: props.date,

      onFocus,
      onBlur,
      onChange,
      onKeyDown,

      value: props.text,

      className: join(
        'react-date-field__input',
        inputProps.className
      )
    })

    return newInputProps
  }

  renderPicker(){
    const props = this.p

    if (props.expanded){

      const picker = getPicker(props)

      if (!picker){
        return
      }

      const pickerProps = props.pickerProps

      const onMouseDown = joinFunctions(pickerProps.onMouseDown, preventDefault)
      const onChange = joinFunctions(pickerProps.onChange, this.onPickerChange)

      const date = props.valid && props.date

      return React.cloneElement(picker, {
        ref: (p) => {
          this.picker = p && p.getView? p.getView(): p

          if (!this.state.viewDate){
            this.onViewDateChange(props.viewDate)
          }
        },

        theme: props.theme || pickerProps.theme,

        className: join(pickerProps.className, 'react-date-field__picker'),

        defaultDate: props.valid? props.date: null,

        viewDate: props.viewDate,
        activeDate: props.activeDate,

        onViewDateChange: this.onViewDateChange,
        onActiveDateChange: this.onActiveDateChange,

        tabIndex: -1,

        onMouseDown,
        onChange
      })
    }
  }

  toMoment(value, props) {

    if (moment.isMoment(value)){
      return value
    }

    props = props || this.p

    let date = toMoment(value, {
      strict: props.strict,
      locale: props.locale,
      dateFormat: props.displayFormat || props.dateFormat || this.p.dateFormat
    })

    if (!date.isValid() && props.displayFormat){
      date = toMoment(value, {
        strict: props.strict,
        locale: props.locale,
        dateFormat: props.dateFormat || this.p.dateFormat
      })
    }

    return date
  }

  isValid(text){
    if (text === undefined){
      text = this.p.text
    }

    return this.toMoment(text).isValid()
  }

  onViewDateChange(viewDate){
    this.setState({
      viewDate
    })
  }

  onActiveDateChange(activeDate){
    this.setState({
      activeDate
    })
  }

  onFieldKeyDown(event){
    const key = event.key

    if (key == 'Enter'){
      this.toggleExpand()
    }
    if (key == 'Escape'){
      this.setExpanded(false)
    }

    if (this.picker && (key == 'Enter' || (key in ARROW_KEYS))){
      return this.picker.onViewKeyDown(event)
    }
  }

  isFocused(){
    return this.state.focused
  }

  onFieldFocus(event){

    if (this.state.focused){
      return
    }

    this.setState({
      focused: true
    })

    if (this.props.expandOnFocus){
      this.setExpanded(true)
    }

    this.props.onFocus(event)
  }

  onFieldBlur(event){

    if (!this.state.focused){
      return
    }

    this.setState({
      focused: false
    })

    this.setExpanded(false)

    this.props.onBlur(event)

    if (!this.isValid() && this.props.validateOnBlur){

      const value = this.lastValidDate && this.p.text != ''?
          this.format(this.lastValidDate):
          ''

      this.onFieldChange(value)
    }
  }

  onInputChange(value, event){

  }

  isExpanded(){
    return this.state.expanded
  }

  toggleExpand(){
    this.setExpanded(!this.p.expanded)
  }

  setExpanded(bool){
    const props = this.p

    if (bool === props.expanded){
      return
    }

    if (!bool){
      this.onCollapse()
    } else {
      this.setState({}, () => {
        this.onExpand()
      })
    }

    if (bool && props.valid){
      this.setState({
        // viewDate: props.date,
        activeDate: props.date
      })
    }

    if (this.props.expanded === undefined){
      this.setState({
        expanded: bool
      })
    }

    this.props.onExpandChange(bool)
  }

  onCollapse(){
    this.props.onCollapse()
  }

  onExpand(){
    this.props.onExpand()
  }

  onFieldChange(value){

    const dateMoment = value == ''?
                        null:
                        this.toMoment(value)

    if (dateMoment === null || dateMoment.isValid()){
      this.onChange(dateMoment)
    }

    this.onTextChange(value)
  }

  onTextChange(text){
    if (this.props.text === undefined){
      this.setState({
        text
      })
    }

    if (this.props.onTextChange){
      this.props.onTextChange(text)
    }
  }

  onPickerChange(dateString, { dateMoment }){
    const props = this.p

    if (props.collapseOnChange){
      this.setExpanded(false)
    }

    this.onTextChange(this.format(dateMoment))
    this.onChange(dateMoment)
  }

  onChange(dateMoment){

    if (dateMoment != null && !moment.isMoment(dateMoment)){
      dateMoment = this.toMoment(dateMoment)
    }

    if (this.props.value === undefined){
      this.setState({
        text: null,
        value: dateMoment
      })
    }

    this.setState({
      activeDate: dateMoment,
      // viewDate: dateMoment
    })

    if (!this.picker || !this.picker.isInView || !this.picker.isInView(dateMoment)){
      this.setState({
        viewDate: dateMoment
      })
    }

    if (this.props.onChange){
      this.props.onChange(this.format(dateMoment), { dateMoment })
    }
  }

  format(moment){
    return moment == null?
      '':
      moment.format(this.p.displayFormat || this.p.dateFormat)
  }

  focusField(){
    const input = findDOMNode(this.field)

    input.focus()
  }

  focus(){
    this.focusField()
  }

}

const emptyFn = () => {}

DateField.defaultProps = {
  strict: true,
  expandOnFocus: true,
  collapseOnChange: true,

  theme: 'default',

  onBlur: () => {},
  onFocus: () => {},

  clearIcon: true,
  validateOnBlur: true,

  onExpandChange: () => {},
  onCollapse: () => {},
  onExpand: () => {}
}

DateField.propTypes = {
  children: function(props, propName){
    const picker = React.Children.toArray(props.children).filter(c => c && c.props && c.props.isDatePicker)[0]

    if (!picker){
      return new Error('You should render a "DatePicker" child in the DateField component.')
    }
  }
}
