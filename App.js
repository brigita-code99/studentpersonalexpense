
import React, { useCallback, useEffect, useState } from 'react';

import {
  SafeAreaView,
  StatusBar,
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
} from 'react-native';

import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { isSupabaseConfigured, supabase } from './lib/supabase';
import AuthScreen from './screens/AuthScreen';

/* ===================== THEME & DATA ===================== */

const COLORS = {
  background: '#062D1B',
  surface: '#103D2A',
  card: '#174532',
  green: '#16A34A',
  lightGreen: '#4ADE80',
  white: '#FFFFFF',
  muted: '#B8C9BF',
  red: '#F87171',
  border: '#285640',
};

const CATEGORIES = [
  { name: 'Food', icon: '🍔' },
  { name: 'Transportation', icon: '🚌' },
  { name: 'School Supplies', icon: '📚' },
  { name: 'Load / Internet', icon: '📱' },
  { name: 'Personal', icon: '🧴' },
  { name: 'Other', icon: '📝' },
];

function formatMoney(amount) {
  return (
    '₱' +
    Number(amount).toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

function pad2(number) {
  return String(number).padStart(2, '0');
}

function toDateKey(date) {
  return (
    date.getFullYear() +
    '-' +
    pad2(date.getMonth() + 1) +
    '-' +
    pad2(date.getDate())
  );
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April',
  'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December',
];

const WEEK_DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const PERIODS = ['Daily', 'Weekly', 'Monthly'];

function sumSavings(list) {
  return list.reduce((total, item) => total + item.amount, 0);
}

/* ===================== SMALL COMPONENTS ===================== */

function FeaturePill({ title }) {
  return (
    <View style={styles.featurePill}>
      <Text style={styles.featureText}>{title}</Text>
    </View>
  );
}

function SummaryCard({ title, amount, color }) {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryLabel}>{title}</Text>
      <Text style={[styles.summaryAmount, { color }]}>
        {formatMoney(amount)}
      </Text>
    </View>
  );
}

function SectionTitle({ children }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

function ExpenseItem({ item, onDelete }) {
  const icon =
    CATEGORIES.find((category) => category.name === item.category)?.icon ||
    '📝';

  return (
    <View style={styles.expenseItem}>
      <View style={styles.expenseIconBox}>
        <Text style={styles.expenseIcon}>{icon}</Text>
      </View>

      <View style={styles.expenseInfo}>
        <Text style={styles.expenseName}>{item.name}</Text>
        <Text style={styles.expenseMeta}>
          {item.category} · {item.date}
        </Text>
      </View>

      <View style={styles.expenseRight}>
        <Text style={styles.expenseAmount}>
          -{formatMoney(item.amount)}
        </Text>

        <TouchableOpacity
          onPress={async () => {
            try {
              await onDelete(item.id);
            } catch (error) {
              Alert.alert('Could not delete expense', error.message);
            }
          }}>
          <Text style={styles.deleteText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* ===================== WELCOME SCREEN ===================== */

function WelcomeScreen({ onGetStarted }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={COLORS.background}
      />

      <ScrollView
        contentContainerStyle={styles.welcomeContent}
        showsVerticalScrollIndicator={false}>

        <View style={styles.logoCircle}>
          <Image
            source={require('./assets/logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.brandName}>STUDENT PERSONAL</Text>
        <Text style={styles.brandNameGreen}>EXPENSE TRACKER</Text>

        <View style={styles.titleUnderline} />

        <Text style={styles.welcomeDescription}>
          Track your allowance, monitor spending, set budgets,
          and save money for your goals.
        </Text>

        <View style={styles.featureGrid}>
          <FeaturePill title="Expense Tracking" />
          <FeaturePill title="Budget Reports" />
          <FeaturePill title="Savings Goals" />
          <FeaturePill title="Secure & Private" />
        </View>

        <TouchableOpacity
          style={styles.getStartedButton}
          onPress={onGetStarted}
          activeOpacity={0.8}>
          <Text style={styles.getStartedText}>GET STARTED</Text>
          <Text style={styles.arrowText}>→</Text>
        </TouchableOpacity>

        <Text style={styles.signInText}>
          Ready to manage your money wisely?
        </Text>

        <Text style={styles.welcomeFooter}>
          YOUR MONEY. YOUR GOALS.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ===================== DASHBOARD ===================== */

function Dashboard({
  allowance,
  expenses,
  onSetAllowance,
  onAddExpense,
  onDeleteExpense,
  onResetAll,
}) {
  const [allowanceInput, setAllowanceInput] = useState('');
  const [expenseName, setExpenseName] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [category, setCategory] = useState('Food');

  const totalExpenses = expenses.reduce(
    (total, item) => total + item.amount,
    0
  );

  const balance = allowance - totalExpenses;

  async function saveAllowance() {
    const amount = Number(allowanceInput);

    if (
      allowanceInput.trim() === '' ||
      !Number.isFinite(amount) ||
      amount < 0
    ) {
      Alert.alert('Invalid allowance', 'Enter a valid allowance amount.');
      return;
    }

    try {
      await onSetAllowance(amount);
    } catch (error) {
      Alert.alert('Could not save allowance', error.message);
      return;
    }

    setAllowanceInput('');

    Alert.alert('Success', 'Your allowance has been updated.');
  }

  async function submitExpense() {
    const amount = Number(expenseAmount);

    if (!expenseName.trim()) {
      Alert.alert('Missing information', 'Enter an expense name.');
      return;
    }

    if (
      expenseAmount.trim() === '' ||
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      Alert.alert('Invalid amount', 'Enter an amount greater than zero.');
      return;
    }

    try {
      await onAddExpense({
        name: expenseName.trim(),
        amount,
        category,
      });
    } catch (error) {
      Alert.alert('Could not add expense', error.message);
      return;
    }

    setExpenseName('');
    setExpenseAmount('');

    Alert.alert('Success', 'Expense added successfully.');
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={COLORS.background}
      />

      <ScrollView
        contentContainerStyle={styles.dashboardContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        <View style={styles.dashboardHeader}>
          <View>
            <Text style={styles.dashboardEyebrow}>MY FINANCES</Text>
            <Text style={styles.dashboardTitle}>Expense Tracker</Text>
            <Text style={styles.dashboardSubtitle}>
              Manage your allowance wisely.
            </Text>
          </View>
        </View>

        <View style={styles.balanceBanner}>
          <Text style={styles.balanceLabel}>REMAINING BALANCE</Text>
          <Text style={styles.balanceAmount}>
            {formatMoney(balance)}
          </Text>
          <Text style={styles.balanceHint}>
            {balance < 0
              ? 'You have exceeded your allowance.'
              : 'Keep spending within your budget.'}
          </Text>
        </View>

        <View style={styles.summaryGrid}>
          <SummaryCard
            title="Allowance"
            amount={allowance}
            color={COLORS.lightGreen}
          />

          <SummaryCard
            title="Expenses"
            amount={totalExpenses}
            color={COLORS.red}
          />
        </View>

        <View style={styles.formCard}>
          <SectionTitle>Set Your Allowance</SectionTitle>

          <TextInput
            style={styles.input}
            placeholder="Enter allowance (₱)"
            placeholderTextColor="#8DA99A"
            keyboardType="decimal-pad"
            value={allowanceInput}
            onChangeText={setAllowanceInput}
          />

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={saveAllowance}>
            <Text style={styles.primaryButtonText}>
              Save Allowance
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.formCard}>
          <SectionTitle>Add an Expense</SectionTitle>

          <TextInput
            style={styles.input}
            placeholder="Expense name (e.g. Lunch)"
            placeholderTextColor="#8DA99A"
            value={expenseName}
            onChangeText={setExpenseName}
          />

          <TextInput
            style={styles.input}
            placeholder="Amount (₱)"
            placeholderTextColor="#8DA99A"
            keyboardType="decimal-pad"
            value={expenseAmount}
            onChangeText={setExpenseAmount}
          />

          <Text style={styles.inputLabel}>Choose a category</Text>

          <View style={styles.categoryGrid}>
            {CATEGORIES.map((item) => (
              <TouchableOpacity
                key={item.name}
                style={[
                  styles.categoryButton,
                  category === item.name && styles.categorySelected,
                ]}
                onPress={() => setCategory(item.name)}>
                <Text style={styles.categoryIcon}>{item.icon}</Text>
                <Text style={styles.categoryText}>{item.name}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={submitExpense}>
            <Text style={styles.primaryButtonText}>
              + Add Expense
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.historyHeader}>
          <SectionTitle>Expense History</SectionTitle>
          <Text style={styles.historyCount}>
            {expenses.length} items
          </Text>
        </View>

        {expenses.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>No expenses yet</Text>
            <Text style={styles.emptyText}>
              Your expenses will appear here after you add them.
            </Text>
          </View>
        ) : (
          expenses.map((item) => (
            <ExpenseItem
              key={item.id}
              item={item}
              onDelete={onDeleteExpense}
            />
          ))
        )}

        <TouchableOpacity
          style={styles.resetButton}
          onPress={() => {
            Alert.alert(
              'Reset Tracker',
              'Are you sure you want to delete your allowance, expenses, and savings?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Reset',
                  style: 'destructive',
                  onPress: onResetAll,
                },
              ]
            );
          }}>
          <Text style={styles.resetButtonText}>Reset All Data</Text>
        </TouchableOpacity>

        <Text style={styles.dashboardFooter}>
          STUDENT PERSONAL EXPENSE TRACKER
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ===================== HISTORY SCREEN ===================== */

function HistoryScreen({ navigation, expenses, onDelete }) {
  function openDetails(item) {
    navigation.getParent()?.navigate('ExpenseDetails', {
      expense: item,
    });
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.dashboardContent}
        showsVerticalScrollIndicator={false}>

        <View style={styles.historyHeader}>
          <SectionTitle>Expense History</SectionTitle>
          <Text style={styles.historyCount}>
            {expenses.length} items
          </Text>
        </View>

        {expenses.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>No expenses yet</Text>
            <Text style={styles.emptyText}>
              Add an expense from the Dashboard first.
            </Text>
          </View>
        ) : (
          expenses.map((item) => (
            <View key={item.id} style={styles.expenseItem}>
              <TouchableOpacity
                style={styles.historyDetailsButton}
                activeOpacity={0.8}
                onPress={() => openDetails(item)}>

                <View style={styles.expenseIconBox}>
                  <Text style={styles.expenseIcon}>
                    {CATEGORIES.find(
                      (c) => c.name === item.category
                    )?.icon || '📝'}
                  </Text>
                </View>

                <View style={styles.expenseInfo}>
                  <Text style={styles.expenseName}>
                    {item.name}
                  </Text>
                  <Text style={styles.expenseMeta}>
                    {item.category} · {item.date}
                  </Text>
                  <Text style={styles.historyViewText}>
                    View details
                  </Text>
                </View>
              </TouchableOpacity>

              <View style={styles.expenseRight}>
                <Text style={styles.expenseAmount}>
                  -{formatMoney(item.amount)}
                </Text>

                <TouchableOpacity
                  onPress={async () => {
                    try {
                      await onDelete(item.id);
                    } catch (error) {
                      Alert.alert('Could not delete expense', error.message);
                    }
                  }}>
                  <Text style={styles.deleteText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/* ===================== EXPENSE DETAILS ===================== */

function ExpenseDetailsScreen({ route }) {
  const { expense } = route.params;

  const icon =
    CATEGORIES.find((c) => c.name === expense.category)?.icon ||
    '📝';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.dashboardContent}>
        <View style={styles.balanceBanner}>
          <Text style={styles.balanceLabel}>
            {icon} {expense.category.toUpperCase()}
          </Text>

          <Text style={styles.balanceAmount}>
            {formatMoney(expense.amount)}
          </Text>

          <Text style={styles.balanceHint}>{expense.name}</Text>
        </View>

        <View style={styles.formCard}>
          <SectionTitle>Expense Details</SectionTitle>

          <Text style={styles.detailText}>
            Name: {expense.name}
          </Text>

          <Text style={styles.detailText}>
            Category: {expense.category}
          </Text>

          <Text style={styles.detailText}>
            Date: {expense.date}
          </Text>

          <Text style={styles.detailText}>
            Amount: {formatMoney(expense.amount)}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ===================== SAVINGS SCREEN ===================== */

function SavingsScreen({ savings, onAddSaving, onDeleteSaving }) {
  const [amountInput, setAmountInput] = useState('');
  const [note, setNote] = useState('');
  const [period, setPeriod] = useState('Daily');
  const [viewDate, setViewDate] = useState(new Date());

  const today = new Date();
  const todayKey = toDateKey(today);

  const weekStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() - today.getDay()
  );

  const weekEnd = new Date(
    weekStart.getFullYear(),
    weekStart.getMonth(),
    weekStart.getDate() + 6
  );

  const weekStartKey = toDateKey(weekStart);
  const weekEndKey = toDateKey(weekEnd);
  const monthPrefix = todayKey.slice(0, 7);

  const dailyList = savings.filter(
    (item) => item.dateKey === todayKey
  );

  const weeklyList = savings.filter(
    (item) =>
      item.dateKey >= weekStartKey &&
      item.dateKey <= weekEndKey
  );

  const monthlyList = savings.filter(
    (item) => item.dateKey.startsWith(monthPrefix)
  );

  const recordList =
    period === 'Daily'
      ? dailyList
      : period === 'Weekly'
      ? weeklyList
      : monthlyList;

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  const savedKeys = new Set(
    savings.map((item) => item.dateKey)
  );

  const cells = [];

  for (let i = 0; i < firstDay; i++) {
    cells.push(null);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(day);
  }

  async function saveMoney() {
    const amount = Number(amountInput);

    if (
      amountInput.trim() === '' ||
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      Alert.alert(
        'Invalid amount',
        'Enter a savings amount greater than zero.'
      );
      return;
    }

    const now = new Date();

    try {
      await onAddSaving({
        amount,
        note: note.trim() || 'Savings',
        dateKey: toDateKey(now),
      });
    } catch (error) {
      Alert.alert('Could not add savings', error.message);
      return;
    }

    setAmountInput('');
    setNote('');

    Alert.alert('Success', 'Savings added. Keep it up!');
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={COLORS.background}
      />

      <ScrollView
        contentContainerStyle={styles.dashboardContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        <View style={styles.balanceBanner}>
          <Text style={styles.balanceLabel}>TOTAL SAVINGS</Text>

          <Text style={styles.balanceAmount}>
            {formatMoney(sumSavings(savings))}
          </Text>

          <Text style={styles.balanceHint}>
            {new Set(monthlyList.map((s) => s.dateKey)).size} day(s)
            saved this month
          </Text>
        </View>

        <View style={savingsStyles.totalsRow}>
          <View style={savingsStyles.totalCard}>
            <Text style={savingsStyles.totalLabel}>Today</Text>
            <Text
              style={savingsStyles.totalAmount}
              numberOfLines={1}
              adjustsFontSizeToFit>
              {formatMoney(sumSavings(dailyList))}
            </Text>
          </View>

          <View style={savingsStyles.totalCard}>
            <Text style={savingsStyles.totalLabel}>This Week</Text>
            <Text
              style={savingsStyles.totalAmount}
              numberOfLines={1}
              adjustsFontSizeToFit>
              {formatMoney(sumSavings(weeklyList))}
            </Text>
          </View>

          <View style={savingsStyles.totalCard}>
            <Text style={savingsStyles.totalLabel}>This Month</Text>
            <Text
              style={savingsStyles.totalAmount}
              numberOfLines={1}
              adjustsFontSizeToFit>
              {formatMoney(sumSavings(monthlyList))}
            </Text>
          </View>
        </View>

        <View style={styles.formCard}>
          <SectionTitle>Add Savings</SectionTitle>

          <TextInput
            style={styles.input}
            placeholder="Amount saved (₱)"
            placeholderTextColor="#8DA99A"
            keyboardType="decimal-pad"
            value={amountInput}
            onChangeText={setAmountInput}
          />

          <TextInput
            style={styles.input}
            placeholder="Note (optional, e.g. Baon leftover)"
            placeholderTextColor="#8DA99A"
            value={note}
            onChangeText={setNote}
          />

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={saveMoney}>
            <Text style={styles.primaryButtonText}>
              + Save Money
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.formCard}>
          <View style={savingsStyles.calendarHeader}>
            <TouchableOpacity
              style={savingsStyles.monthButton}
              onPress={() =>
                setViewDate(new Date(year, month - 1, 1))
              }>
              <Text style={savingsStyles.monthButtonText}>‹</Text>
            </TouchableOpacity>

            <Text style={savingsStyles.monthTitle}>
              {MONTH_NAMES[month]} {year}
            </Text>

            <TouchableOpacity
              style={savingsStyles.monthButton}
              onPress={() =>
                setViewDate(new Date(year, month + 1, 1))
              }>
              <Text style={savingsStyles.monthButtonText}>›</Text>
            </TouchableOpacity>
          </View>

          <View style={savingsStyles.weekRow}>
            {WEEK_DAYS.map((day, index) => (
              <Text
                key={index}
                style={savingsStyles.weekDayText}>
                {day}
              </Text>
            ))}
          </View>

          <View style={savingsStyles.daysGrid}>
            {cells.map((day, index) => {
              if (day === null) {
                return (
                  <View
                    key={'blank' + index}
                    style={savingsStyles.dayCell}
                  />
                );
              }

              const key =
                year + '-' + pad2(month + 1) + '-' + pad2(day);

              const saved = savedKeys.has(key);
              const isToday = key === todayKey;

              return (
                <View key={key} style={savingsStyles.dayCell}>
                  <View
                    style={[
                      savingsStyles.dayCircle,
                      isToday && savingsStyles.dayToday,
                      saved && savingsStyles.daySaved,
                    ]}>
                    <Text
                      style={[
                        savingsStyles.dayText,
                        saved && savingsStyles.dayTextSaved,
                      ]}>
                      {day}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>

          <Text style={savingsStyles.legend}>
            ● Green = you saved that day
          </Text>
        </View>

        <SectionTitle>Savings Records</SectionTitle>

        <View style={savingsStyles.tabRow}>
          {PERIODS.map((item) => (
            <TouchableOpacity
              key={item}
              style={[
                savingsStyles.tab,
                period === item && savingsStyles.tabActive,
              ]}
              onPress={() => setPeriod(item)}>
              <Text
                style={[
                  savingsStyles.tabText,
                  period === item && savingsStyles.tabTextActive,
                ]}>
                {item}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={savingsStyles.recordTotal}>
          {period} total: {formatMoney(sumSavings(recordList))} ·{' '}
          {recordList.length} record(s)
        </Text>

        {recordList.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>🐷</Text>
            <Text style={styles.emptyTitle}>No savings yet</Text>
            <Text style={styles.emptyText}>
              Your {period.toLowerCase()} savings will appear here.
            </Text>
          </View>
        ) : (
          recordList.map((item) => (
            <View key={item.id} style={styles.expenseItem}>
              <View style={styles.expenseIconBox}>
                <Text style={styles.expenseIcon}>🐷</Text>
              </View>

              <View style={styles.expenseInfo}>
                <Text style={styles.expenseName}>
                  {item.note}
                </Text>
                <Text style={styles.expenseMeta}>
                  {item.date}
                </Text>
              </View>

              <View style={styles.expenseRight}>
                <Text style={savingsStyles.savedAmount}>
                  +{formatMoney(item.amount)}
                </Text>

                <TouchableOpacity
                  onPress={async () => {
                    try {
                      await onDeleteSaving(item.id);
                    } catch (error) {
                      Alert.alert('Could not delete savings', error.message);
                    }
                  }}>
                  <Text style={styles.deleteText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/* ===================== ABOUT SCREEN ===================== */

const PRIVACY_POLICY_SECTIONS = [
  {
    title: 'Information you enter',
    body:
      'The app stores your email address with Supabase Authentication and your allowance, expense, and savings records in the connected Supabase project. Records are associated with your account and protected by database row-level security so authenticated users can access only their own records.',
  },
  {
    title: 'Collection and sharing',
    body:
      'Your records are sent to the Supabase project configured for this app to provide account sign-in and cloud sync. Review Supabase’s privacy and security terms for information about its infrastructure and processing. The app does not intentionally share your records with other users.',
  },
  {
    title: 'Your choices',
    body:
      'You can choose what information to enter. Use Reset All Data to delete your tracker records, or sign out from the About screen. Account deletion is not currently available in the app; contact the project administrator to request deletion of your account and associated data. Do not reuse a password from another service.',
  },
  {
    title: 'Changes and questions',
    body:
      'This notice may be updated when the app changes. For questions about the app, contact its publisher through the app store or other channel where you received it.',
  },
];

const TERMS_OF_USE_SECTIONS = [
  {
    title: 'What the app is for',
    body:
      'Student Personal Expense Tracker is a personal budgeting and record-keeping tool for educational purposes. It is not a bank, wallet, payment service, or financial adviser, and it does not move or store money.',
  },
  {
    title: 'Your records',
    body:
      'You are responsible for the information you enter and for checking that totals and records meet your needs. Records are saved to your Supabase account. Keep your login credentials secure and do not rely on the app as your sole copy of important information.',
  },
  {
    title: 'Not professional advice',
    body:
      'Budgets, balances, and summaries are provided for general tracking only. They are not financial, investment, tax, or legal advice. Make your own decisions and consult a qualified professional when appropriate.',
  },
  {
    title: 'Availability and updates',
    body:
      'Features may change as the app is updated. The app depends on Supabase services and may not always be available or free from errors. Check important figures independently.',
  },
  {
    title: 'Using the app responsibly',
    body:
      'Use the app lawfully and do not enter information you do not have permission to use. By using the app, you agree to these terms. If you do not agree, stop using it and request deletion of your account and tracker data from the project administrator.',
  },
];

function PolicyScreen({ title, introduction, sections }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={COLORS.background}
      />

      <ScrollView
        contentContainerStyle={styles.dashboardContent}
        showsVerticalScrollIndicator={false}>
        <View style={aboutStyles.aboutHeader}>
          <Text style={aboutStyles.aboutEyebrow}>
            STUDENT PERSONAL EXPENSE TRACKER
          </Text>
          <Text style={aboutStyles.aboutTitle}>{title}</Text>
          <Text style={aboutStyles.aboutSubtitle}>
            Last updated: November 10, 2026
          </Text>
        </View>

        <View style={styles.formCard}>
          <Text style={aboutStyles.aboutParagraph}>{introduction}</Text>
          {sections.map((section) => (
            <View key={section.title} style={aboutStyles.policySection}>
              <Text style={aboutStyles.policySectionTitle}>
                {section.title}
              </Text>
              <Text style={aboutStyles.aboutParagraph}>
                {section.body}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function AboutScreen({ navigation, onSignOut }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.dashboardContent}
        showsVerticalScrollIndicator={false}>

        <View style={aboutStyles.aboutHeader}>
          <Text style={aboutStyles.aboutEyebrow}>
            STUDENT SERVICES
          </Text>

          <Text style={aboutStyles.aboutTitle}>
            About Our App
          </Text>

          <Text style={aboutStyles.aboutSubtitle}>
            Student Personal Expense Tracker
          </Text>
        </View>

        <View style={aboutStyles.aboutLogoCircle}>
          <Image
            source={require('./assets/logo.png')}
            style={aboutStyles.aboutLogo}
            resizeMode="contain"
          />
        </View>

        <View style={styles.formCard}>
          <SectionTitle>
            About Student Personal Expense Tracker
          </SectionTitle>

          <Text style={aboutStyles.aboutParagraph}>
            Student Personal Expense Tracker is a simple and
            user-friendly mobile application developed to help
            students manage their personal finances.
          </Text>

          <Text style={aboutStyles.aboutParagraph}>
            The application helps students keep track of their
            daily allowance, record expenses, monitor their
            remaining balance, and manage their savings. It also
            provides an organized expense history so students
            can review where their money goes.
          </Text>
        </View>

        <View style={styles.formCard}>
          <SectionTitle>Our Main Features</SectionTitle>

          <AboutFeature
            icon="💰"
            title="Dashboard"
            description="View your total allowance, expenses, and remaining balance."
          />

          <AboutFeature
            icon="📝"
            title="Expense Tracking"
            description="Add, categorize, and manage your daily expenses."
          />

          <AboutFeature
            icon="📋"
            title="Expense History"
            description="Review your previously recorded transactions."
          />

          <AboutFeature
            icon="🐷"
            title="Savings Tracker"
            description="Record your savings and monitor your saving progress."
          />
        </View>

        <View style={styles.formCard}>
          <SectionTitle>Our Goal</SectionTitle>

          <Text style={aboutStyles.aboutParagraph}>
            Our goal is to encourage students to become more
            responsible with their money by developing good
            budgeting, spending, and saving habits.
          </Text>

          <View style={aboutStyles.aboutGoalBox}>
            <Text style={aboutStyles.aboutGoalText}>
              Manage your money wisely.
            </Text>
            <Text style={aboutStyles.aboutGoalText}>
              Save more. Spend smarter!
            </Text>
          </View>
        </View>

        <View style={styles.formCard}>
          <SectionTitle>Policies</SectionTitle>

          <TouchableOpacity
            accessibilityRole="button"
            style={aboutStyles.policyLink}
            onPress={() => navigation.navigate('PrivacyPolicy')}>
            <View style={aboutStyles.aboutFeatureInfo}>
              <Text style={aboutStyles.policyLinkTitle}>
                Privacy Policy
              </Text>
              <Text style={aboutStyles.aboutFeatureDescription}>
                Learn how tracker information is handled.
              </Text>
            </View>
            <Text style={aboutStyles.policyLinkArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="button"
            style={aboutStyles.policyLink}
            onPress={() => navigation.navigate('TermsOfUse')}>
            <View style={aboutStyles.aboutFeatureInfo}>
              <Text style={aboutStyles.policyLinkTitle}>
                Terms of Use
              </Text>
              <Text style={aboutStyles.aboutFeatureDescription}>
                Read the terms for using this app.
              </Text>
            </View>
            <Text style={aboutStyles.policyLinkArrow}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={aboutStyles.aboutFooter}>
          <Text style={aboutStyles.aboutFooterTitle}>
            STUDENT PERSONAL EXPENSE TRACKER
          </Text>

          <Text style={aboutStyles.aboutFooterVersion}>
            Version 1.0.0
          </Text>

          <Text style={aboutStyles.aboutFooterText}>
            Developed for educational purposes.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.signOutButton}
          onPress={onSignOut}>
          <Text style={styles.signOutButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function AboutFeature({ icon, title, description }) {
  return (
    <View style={aboutStyles.aboutFeature}>
      <Text style={aboutStyles.aboutFeatureIcon}>{icon}</Text>

      <View style={aboutStyles.aboutFeatureInfo}>
        <Text style={aboutStyles.aboutFeatureTitle}>
          {title}
        </Text>

        <Text style={aboutStyles.aboutFeatureDescription}>
          {description}
        </Text>
      </View>
    </View>
  );
}

/* ===================== NAVIGATION ===================== */

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();


function MenuNavigator({
  allowance,
  expenses,
  setAllowance,
  addExpense,
  deleteExpense,
  savings,
  addSavings,
  deleteSavings,
  onResetAll,
  onSignOut,
}) {
  const icons = {
    Dashboard: '🏠',
    History: '📋',
    Savings: '🐷',
    About: 'ℹ️',
  };

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,

        tabBarActiveTintColor: '#4ADE80',
        tabBarInactiveTintColor: '#B8C9BF',

        tabBarStyle: {
          backgroundColor: '#103D2A',
          height: 72,
          paddingTop: 9,
          paddingBottom: 9,
          borderTopWidth: 1,
          borderTopColor: '#285640',
          elevation: 12,
        },

        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginTop: 3,
        },

        tabBarIcon: ({ focused }) => (
          <View
            style={{
              width: 48,
              height: 30,
              borderRadius: 16,
              backgroundColor: focused
                ? '#285640'
                : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 19 }}>
              {icons[route.name]}
            </Text>
          </View>
        ),
      })}
    >
      <Tab.Screen name="Dashboard">
        {props => (
          <Dashboard
            {...props}
            allowance={allowance}
            expenses={expenses}
            onSetAllowance={setAllowance}
            onAddExpense={addExpense}
            onDeleteExpense={deleteExpense}
            onResetAll={onResetAll}
          />
        )}
      </Tab.Screen>

      <Tab.Screen name="History">
        {props => (
          <HistoryScreen
            {...props}
            expenses={expenses}
            onDelete={deleteExpense}
          />
        )}
      </Tab.Screen>

      <Tab.Screen name="Savings">
        {props => (
          <SavingsScreen
            {...props}
            savings={savings}
            onAddSaving={addSavings}
            onDeleteSaving={deleteSavings}
          />
        )}
      </Tab.Screen>

      <Tab.Screen name="About">
        {props => <AboutScreen {...props} onSignOut={onSignOut} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

/* ===================== MAIN APP ===================== */

export default function App() {
  const [allowance, setAllowance] = useState(0);
  const [expenses, setExpenses] = useState([]);
  const [savings, setSavings] = useState([]);
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState('');
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return undefined;
    }

    let active = true;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) {
        setSession(nextSession);
      }
    });

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) {
          throw error;
        }
        if (active) {
          setSession(data.session);
        }
      })
      .catch((error) => {
        if (active) {
          setAuthError(error.message || 'Could not restore your session.');
        }
      })
      .finally(() => {
        if (active) {
          setAuthLoading(false);
        }
      });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const fetchUserData = useCallback(async (userId) => {
    if (!supabase) {
      throw new Error('Supabase is not configured.');
    }

    const [financeResult, expenseResult, savingsResult] = await Promise.all([
      supabase
        .from('user_finances')
        .select('allowance')
        .eq('user_id', userId)
        .maybeSingle(),
      supabase
        .from('expenses')
        .select('id, name, amount, category, expense_date')
        .eq('user_id', userId)
        .order('expense_date', { ascending: false })
        .order('created_at', { ascending: false }),
      supabase
        .from('savings')
        .select('id, amount, note, saving_date')
        .eq('user_id', userId)
        .order('saving_date', { ascending: false })
        .order('created_at', { ascending: false }),
    ]);

    const failedResult = [financeResult, expenseResult, savingsResult].find(
      (result) => result.error
    );
    if (failedResult) {
      throw failedResult.error;
    }

    return {
      allowance: Number(financeResult.data?.allowance ?? 0),
      expenses: (expenseResult.data ?? []).map((item) => ({
        id: item.id,
        name: item.name,
        amount: Number(item.amount),
        category: item.category,
        date: new Date(`${item.expense_date}T00:00:00`).toLocaleDateString(
          'en-PH'
        ),
      })),
      savings: (savingsResult.data ?? []).map((item) => ({
        id: item.id,
        amount: Number(item.amount),
        note: item.note,
        dateKey: item.saving_date,
        date: new Date(`${item.saving_date}T00:00:00`).toLocaleDateString(
          'en-PH'
        ),
      })),
    };
  }, []);

  useEffect(() => {
    if (!session) {
      setAllowance(0);
      setExpenses([]);
      setSavings([]);
      setDataError('');
      setDataLoading(false);
      return undefined;
    }

    let active = true;
    setDataLoading(true);
    setDataError('');

    fetchUserData(session.user.id)
      .then((data) => {
        if (active) {
          setAllowance(data.allowance);
          setExpenses(data.expenses);
          setSavings(data.savings);
        }
      })
      .catch((error) => {
        if (active) {
          setDataError(error.message || 'Could not load your tracker data.');
        }
      })
      .finally(() => {
        if (active) {
          setDataLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [fetchUserData, session]);

  async function authenticate(email, password, isSignUp) {
    if (!supabase) {
      throw new Error('Supabase is not configured.');
    }

    const result = isSignUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });

    if (result.error) {
      throw result.error;
    }

    if (isSignUp && !result.data.session) {
      return 'Account created. Check your email to confirm your address, then sign in.';
    }

    return '';
  }

  function requireUserId() {
    if (!supabase || !session?.user?.id) {
      throw new Error('Sign in before saving tracker data.');
    }
    return session.user.id;
  }

  async function setAllowanceForUser(amount) {
    const result = await supabase
      .from('user_finances')
      .upsert(
        {
          user_id: requireUserId(),
          allowance: amount,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );
    if (result.error) {
      throw result.error;
    }
    setAllowance(amount);
  }

  async function addExpense(item) {
    const result = await supabase
      .from('expenses')
      .insert({
        user_id: requireUserId(),
        name: item.name,
        amount: item.amount,
        category: item.category,
        expense_date: toDateKey(new Date()),
      })
      .select('id, name, amount, category, expense_date')
      .single();
    if (result.error) {
      throw result.error;
    }

    const savedItem = {
      id: result.data.id,
      name: result.data.name,
      amount: Number(result.data.amount),
      category: result.data.category,
      date: new Date(
        `${result.data.expense_date}T00:00:00`
      ).toLocaleDateString('en-PH'),
    };
    setExpenses((previous) => [savedItem, ...previous]);
  }

  async function deleteExpense(id) {
    const result = await supabase
      .from('expenses')
      .delete()
      .eq('user_id', requireUserId())
      .eq('id', id)
      .select('id')
      .single();
    if (result.error) {
      throw result.error;
    }
    setExpenses((previous) => previous.filter((item) => item.id !== id));
  }

  async function addSaving(item) {
    const result = await supabase
      .from('savings')
      .insert({
        user_id: requireUserId(),
        amount: item.amount,
        note: item.note,
        saving_date: item.dateKey,
      })
      .select('id, amount, note, saving_date')
      .single();
    if (result.error) {
      throw result.error;
    }

    const savedItem = {
      id: result.data.id,
      amount: Number(result.data.amount),
      note: result.data.note,
      dateKey: result.data.saving_date,
      date: new Date(
        `${result.data.saving_date}T00:00:00`
      ).toLocaleDateString('en-PH'),
    };
    setSavings((previous) => [savedItem, ...previous]);
  }

  async function deleteSaving(id) {
    const result = await supabase
      .from('savings')
      .delete()
      .eq('user_id', requireUserId())
      .eq('id', id)
      .select('id')
      .single();
    if (result.error) {
      throw result.error;
    }
    setSavings((previous) => previous.filter((item) => item.id !== id));
  }

  async function resetAllData() {
    const { error } = await supabase.rpc('reset_tracker_data');
    if (error) {
      Alert.alert('Could not reset data', error.message);
      return;
    }
    setAllowance(0);
    setExpenses([]);
    setSavings([]);
    Alert.alert('Reset Successful', 'All tracker data has been cleared.');
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      Alert.alert('Could not sign out', error.message);
    }
  }

  async function retryLoadingData() {
    if (!session) {
      return;
    }
    setDataLoading(true);
    setDataError('');
    try {
      const data = await fetchUserData(session.user.id);
      setAllowance(data.allowance);
      setExpenses(data.expenses);
      setSavings(data.savings);
    } catch (error) {
      setDataError(error.message || 'Could not load your tracker data.');
    } finally {
      setDataLoading(false);
    }
  }

  if (authLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Text style={styles.status}>Checking your session...</Text>
      </SafeAreaView>
    );
  }

  if (session && (dataLoading || dataError)) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>
            {dataLoading ? 'Loading your tracker' : 'Could not load your data'}
          </Text>
          {!!dataError && <Text style={styles.statusError}>{dataError}</Text>}
          {!!dataError && (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={retryLoadingData}>
              <Text style={styles.primaryButtonText}>Try Again</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <NavigationContainer key={session?.user?.id || 'signed-out'}>
      <Stack.Navigator
        initialRouteName={session ? 'Main' : 'Welcome'}
        screenOptions={{
          headerStyle: {
            backgroundColor: COLORS.surface,
          },
          headerTintColor: COLORS.white,
        }}>

        {!session && (
          <Stack.Screen name="Welcome" options={{ headerShown: false }}>
            {({ navigation }) => (
              <WelcomeScreen
                onGetStarted={() => navigation.navigate('Auth')}
              />
            )}
          </Stack.Screen>
        )}

        {!session && (
          <Stack.Screen name="Auth" options={{ title: 'Account' }}>
            {() => (
              <AuthScreen
                onAuthenticate={authenticate}
                initialError={authError}
                isConfigured={isSupabaseConfigured}
              />
            )}
          </Stack.Screen>
        )}

        {session && (
          <Stack.Screen name="Main" options={{ headerShown: false }}>
            {() => (
              <MenuNavigator
                allowance={allowance}
                expenses={expenses}
                setAllowance={setAllowanceForUser}
                addExpense={addExpense}
                deleteExpense={deleteExpense}
                savings={savings}
                addSavings={addSaving}
                deleteSavings={deleteSaving}
                onResetAll={resetAllData}
                onSignOut={signOut}
              />
            )}
          </Stack.Screen>
        )}

        {session && (
          <Stack.Screen
            name="ExpenseDetails"
            component={ExpenseDetailsScreen}
            options={{
              title: 'Expense Details',
              headerBackTitle: 'Back',
            }}
          />
        )}

        <Stack.Screen
          name="PrivacyPolicy"
          options={{ title: 'Privacy Policy' }}>
          {() => (
            <PolicyScreen
              title="Privacy Policy"
              introduction="This policy explains how Student Personal Expense Tracker handles information when you use the app."
              sections={PRIVACY_POLICY_SECTIONS}
            />
          )}
        </Stack.Screen>

        <Stack.Screen
          name="TermsOfUse"
          options={{ title: 'Terms of Use' }}>
          {() => (
            <PolicyScreen
              title="Terms of Use"
              introduction="These terms describe the intended use and limitations of Student Personal Expense Tracker."
              sections={TERMS_OF_USE_SECTIONS}
            />
          )}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
}

/* ===================== MAIN STYLES ===================== */

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  status: {
    color: COLORS.white,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
  },

  statusCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    margin: 22,
    marginTop: 100,
    padding: 20,
  },

  statusTitle: {
    color: COLORS.white,
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 8,
  },

  statusError: {
    color: COLORS.red,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
  },

  welcomeContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 25,
    paddingTop: 30,
    paddingBottom: 35,
  },

  logoCircle: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 5,
    borderColor: COLORS.green,
    backgroundColor: '#DFF8E8',
    padding: 7,
    marginBottom: 35,
    overflow: 'hidden',
  },

  logoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 90,
  },

  brandName: {
    color: COLORS.white,
    fontSize: 25,
    fontWeight: '900',
    letterSpacing: 1.2,
    textAlign: 'center',
  },

  brandNameGreen: {
    color: COLORS.lightGreen,
    fontSize: 23,
    fontWeight: '900',
    letterSpacing: 1.4,
    textAlign: 'center',
    marginTop: 5,
  },

  titleUnderline: {
    width: 65,
    height: 4,
    borderRadius: 5,
    backgroundColor: COLORS.lightGreen,
    marginTop: 22,
    marginBottom: 30,
  },

  welcomeDescription: {
    color: COLORS.muted,
    fontSize: 15,
    lineHeight: 25,
    textAlign: 'center',
    marginBottom: 38,
    paddingHorizontal: 3,
  },

  featureGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 38,
  },

  featurePill: {
    width: '48%',
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 30,
    paddingHorizontal: 8,
  },

  featureText: {
    color: '#D8E6DD',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },

  getStartedButton: {
    width: '100%',
    minHeight: 60,
    borderRadius: 35,
    backgroundColor: COLORS.green,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 15,
    elevation: 5,
    shadowColor: COLORS.green,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
  },

  getStartedText: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 1.5,
  },

  arrowText: {
    color: COLORS.white,
    fontSize: 26,
    fontWeight: 'bold',
  },

  signInText: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 25,
    textAlign: 'center',
  },

  welcomeFooter: {
    color: '#6E9980',
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: 'bold',
    marginTop: 32,
  },

  dashboardContent: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 35,
  },

  dashboardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 22,
    gap: 10,
  },

  dashboardEyebrow: {
    color: COLORS.lightGreen,
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: 5,
  },

  dashboardTitle: {
    color: COLORS.white,
    fontSize: 24,
    fontWeight: '900',
  },

  dashboardSubtitle: {
    color: COLORS.muted,
    fontSize: 13,
    marginTop: 5,
  },

  balanceBanner: {
    backgroundColor: COLORS.green,
    padding: 23,
    borderRadius: 20,
    marginBottom: 15,
  },

  balanceLabel: {
    color: '#D7FBE3',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },

  balanceAmount: {
    color: COLORS.white,
    fontSize: 32,
    fontWeight: '900',
    marginTop: 10,
  },

  balanceHint: {
    color: '#D7FBE3',
    fontSize: 12,
    marginTop: 7,
  },

  summaryGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 22,
  },

  summaryCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 15,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  summaryLabel: {
    color: COLORS.muted,
    fontSize: 11,
    marginBottom: 12,
  },

  summaryAmount: {
    fontSize: 19,
    fontWeight: '900',
  },

  formCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 17,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  sectionTitle: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 14,
  },

  input: {
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: COLORS.white,
    fontSize: 14,
    marginBottom: 11,
  },

  primaryButton: {
    backgroundColor: COLORS.green,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginTop: 3,
  },

  primaryButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '800',
  },

  inputLabel: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 3,
    marginBottom: 10,
  },

  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },

  categoryButton: {
    width: '48%',
    minHeight: 43,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 10,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },

  categorySelected: {
    borderColor: COLORS.lightGreen,
    backgroundColor: '#1A5639',
  },

  categoryIcon: {
    fontSize: 16,
  },

  categoryText: {
    color: COLORS.white,
    fontSize: 11,
    flexShrink: 1,
  },

  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 5,
  },

  historyCount: {
    color: COLORS.muted,
    fontSize: 12,
    marginBottom: 14,
  },

  expenseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    borderRadius: 13,
    marginBottom: 10,
    gap: 10,
  },

  expenseIconBox: {
    width: 43,
    height: 43,
    borderRadius: 12,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
  },

  expenseIcon: {
    fontSize: 21,
  },

  expenseInfo: {
    flex: 1,
  },

  expenseName: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '700',
  },

  expenseMeta: {
    color: COLORS.muted,
    fontSize: 10,
    marginTop: 5,
  },

  expenseRight: {
    alignItems: 'flex-end',
  },

  expenseAmount: {
    color: COLORS.red,
    fontSize: 12,
    fontWeight: '800',
  },

  deleteText: {
    color: COLORS.lightGreen,
    fontSize: 11,
    marginTop: 7,
  },

  historyDetailsButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  historyViewText: {
    color: COLORS.lightGreen,
    fontSize: 10,
    marginTop: 5,
  },

  detailText: {
    color: COLORS.muted,
    fontSize: 13,
    marginBottom: 12,
  },

  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 15,
    padding: 25,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  emptyIcon: {
    fontSize: 35,
    marginBottom: 10,
  },

  emptyTitle: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 15,
  },

  emptyText: {
    color: COLORS.muted,
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 19,
    marginTop: 7,
  },

  resetButton: {
    backgroundColor: '#57302C',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },

  resetButtonText: {
    color: '#FCA5A5',
    fontWeight: 'bold',
  },

  signOutButton: {
    backgroundColor: '#57302C',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
  },

  signOutButtonText: {
    color: '#FCA5A5',
    fontWeight: 'bold',
  },

  dashboardFooter: {
    color: '#6E9980',
    fontSize: 10,
    letterSpacing: 1.5,
    textAlign: 'center',
    marginTop: 25,
  },

  tabIcon: {
    fontSize: 20,
  },
});

/* ===================== SAVINGS STYLES ===================== */

const savingsStyles = StyleSheet.create({
  totalsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },

  totalCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  totalLabel: {
    color: COLORS.muted,
    fontSize: 11,
    marginBottom: 8,
  },

  totalAmount: {
    color: COLORS.lightGreen,
    fontSize: 15,
    fontWeight: '900',
  },

  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },

  monthButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  monthButtonText: {
    color: COLORS.lightGreen,
    fontSize: 20,
    fontWeight: 'bold',
  },

  monthTitle: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '800',
  },

  weekRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },

  weekDayText: {
    width: '14.2857%',
    textAlign: 'center',
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: 'bold',
  },

  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  dayCell: {
    width: '14.2857%',
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },

  dayToday: {
    borderColor: COLORS.lightGreen,
  },

  daySaved: {
    backgroundColor: COLORS.green,
  },

  dayText: {
    color: COLORS.white,
    fontSize: 12,
  },

  dayTextSaved: {
    fontWeight: '900',
  },

  legend: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 12,
    textAlign: 'center',
  },

  tabRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },

  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  tabActive: {
    backgroundColor: COLORS.green,
    borderColor: COLORS.lightGreen,
  },

  tabText: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '700',
  },

  tabTextActive: {
    color: COLORS.white,
  },

  recordTotal: {
    color: COLORS.muted,
    fontSize: 12,
    marginBottom: 12,
  },

  savedAmount: {
    color: COLORS.lightGreen,
    fontSize: 12,
    fontWeight: '800',
  },
});

/* ===================== ABOUT STYLES ===================== */

const aboutStyles = StyleSheet.create({
  aboutHeader: {
    marginBottom: 22,
  },

  aboutEyebrow: {
    color: COLORS.lightGreen,
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: 7,
  },

  aboutTitle: {
    color: COLORS.white,
    fontSize: 27,
    fontWeight: '900',
  },

  aboutSubtitle: {
    color: COLORS.muted,
    fontSize: 13,
    marginTop: 6,
  },

  aboutLogoCircle: {
    width: 115,
    height: 115,
    borderRadius: 58,
    backgroundColor: '#DFF8E8',
    borderWidth: 3,
    borderColor: COLORS.green,
    padding: 5,
    alignSelf: 'center',
    marginBottom: 22,
    overflow: 'hidden',
  },

  aboutLogo: {
    width: '100%',
    height: '100%',
    borderRadius: 55,
  },

  aboutParagraph: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 22,
    marginBottom: 13,
    textAlign: 'justify',
  },

  policySection: {
    marginTop: 8,
  },

  policySectionTitle: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 8,
  },

  policyLink: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 10,
  },

  policyLinkTitle: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },

  policyLinkArrow: {
    color: COLORS.lightGreen,
    fontSize: 28,
    marginLeft: 12,
  },

  aboutFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
    marginBottom: 10,
    gap: 12,
  },

  aboutFeatureIcon: {
    fontSize: 25,
  },

  aboutFeatureInfo: {
    flex: 1,
  },

  aboutFeatureTitle: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 4,
  },

  aboutFeatureDescription: {
    color: COLORS.muted,
    fontSize: 11,
    lineHeight: 17,
  },

  aboutGoalBox: {
    backgroundColor: '#1A5639',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 5,
  },

  aboutGoalText: {
    color: COLORS.lightGreen,
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'center',
    marginVertical: 3,
  },

  aboutFooter: {
    alignItems: 'center',
    paddingVertical: 20,
  },

  aboutFooterTitle: {
    color: COLORS.lightGreen,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
    textAlign: 'center',
  },

  aboutFooterVersion: {
    color: COLORS.white,
    fontSize: 11,
    marginTop: 9,
  },

  aboutFooterText: {
    color: COLORS.muted,
    fontSize: 10,
    marginTop: 5,
  },
});
